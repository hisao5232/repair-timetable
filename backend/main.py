from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import datetime as dt

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# データベース設定
db_url = f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('DB_HOST')}/{os.getenv('POSTGRES_DB')}"

engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 1. データベースモデル (最初) ---
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
    created_at = Column(DateTime, default=dt.datetime.now) # 日本時間に合わせる
    received_by = Column(String, nullable=True)        # 受付担当
    is_own_lease = Column(Boolean, default=False)      # 自社リース機フラグ
    lease_location = Column(String, nullable=True)     # リース拠点

Base.metadata.create_all(bind=engine)

# --- 2. Pydanticモデル (関数の前に定義) ---
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
    received_by: str | None = None
    is_own_lease: bool = False
    lease_location: str | None = None

class AppointmentUpdate(BaseModel):
    customer_name: str
    contact_person: str
    phone_number: str
    machine_model: str
    serial_number: str
    location: str
    failure_symptoms: str
    appointment_date: datetime
    status: str
    worker_name: str | None = None
    completion_notes: str | None = None
    completed_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)
    received_by: str | None = None
    is_own_lease: bool = False
    lease_location: str | None = None

# --- 3. APIエンドポイント ---
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
def update_appointment(app_id: int, item: AppointmentUpdate):
    db = SessionLocal()
    db_item = db.query(Appointment).filter(Appointment.id == app_id).first()
    if not db_item:
        db.close()
        raise HTTPException(status_code=404, detail="Not Found")
    
    # 全項目をループで更新
    update_data = item.model_dump()
    for key, value in update_data.items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)
    db.close()
    return db_item

@app.delete("/appointments/{app_id}")
def delete_appointment(app_id: int):
    db = SessionLocal()
    db_item = db.query(Appointment).filter(Appointment.id == app_id).first()
    if not db_item:
        db.close()
        raise HTTPException(status_code=404, detail="Not Found")
    db.delete(db_item)
    db.commit()
    db.close()
    return {"message": "Deleted"}
    