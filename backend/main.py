from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import datetime as dt

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 接続エラー回避のため一旦すべて許可
    allow_methods=["*"],
    allow_headers=["*"],
)

# データベース設定
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_DB = os.getenv("POSTGRES_DB")
DB_HOST = os.getenv("DB_HOST")
db_url = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{DB_HOST}/{POSTGRES_DB}"

engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- データベースモデル (1つだけに絞る) ---
class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String)
    contact_person = Column(String)
    phone_number = Column(String)
    machine_model = Column(String)
    serial_number = Column(String)
    failure_symptoms = Column(Text)
    location = Column(String)
    appointment_date = Column(DateTime)
    status = Column(String, default="pending")
    worker_name = Column(String, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    completion_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

# テーブル作成（エラーが出ないようにtry-exceptで囲む）
try:
    Base.metadata.create_all(bind=engine)
    print("Table created successfully")
except Exception as e:
    print(f"Table creation error: {e}")

# --- Pydanticモデル ---
class AppointmentCreate(BaseModel):
    customer_name: str
    contact_person: str
    phone_number: str
    machine_model: str
    serial_number: str
    failure_symptoms: str
    location: str
    appointment_date: datetime
    model_config = ConfigDict(from_attributes=True)

class AppointmentUpdate(BaseModel):
    status: str
    worker_name: str
    completion_notes: str
    completed_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- APIエンドポイント ---
@app.get("/")
def read_root():
    return {"status": "Success"}

@app.post("/appointments")
def create_appointment(item: AppointmentCreate):
    db = SessionLocal()
    db_item = Appointment(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    db.close()
    return db_item

@app.get("/appointments")
def get_appointments():
    db = SessionLocal()
    appointments = db.query(Appointment).all()
    db.close()
    return appointments

@app.patch("/appointments/{app_id}")
def update_appointment_status(app_id: int, item: AppointmentUpdate):
    db = SessionLocal()
    db_item = db.query(Appointment).filter(Appointment.id == app_id).first()
    if db_item:
        db_item.status = item.status
        db_item.worker_name = item.worker_name
        db_item.completion_notes = item.completion_notes
        db_item.completed_at = item.completed_at
        db.commit()
        db.refresh(db_item)
    db.close()
    return db_item
    