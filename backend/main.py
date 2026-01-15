from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel
from datetime import datetime
import datetime as dt  # 名前衝突を避けるために別名でインポート

app = FastAPI()

# CORS設定：フロントエンドからの通信を許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://repair.go-pro-world.net"],
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

# --- データベースモデル ---
class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String)      # 顧客名
    contact_person = Column(String)     # 先方担当者
    phone_number = Column(String)       # 先方連絡先
    machine_model = Column(String)      # 建機の型式
    serial_number = Column(String)      # シリアルNo
    failure_symptoms = Column(Text)     # 故障症状
    location = Column(String)           # 現場住所
    appointment_date = Column(DateTime) # 訪問予定日時
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=dt.datetime.utcnow)

# 起動時にテーブルを作成
try:
    Base.metadata.create_all(bind=engine)
    print("Table created successfully")
except Exception as e:
    print(f"Table creation failed: {e}")
    # 開発中はここでエラーが見えるようにしておきます

# --- Pydanticモデル（リクエスト/レスポンス用） ---
class AppointmentCreate(BaseModel):
    customer_name: str
    contact_person: str
    phone_number: str
    machine_model: str
    serial_number: str
    failure_symptoms: str
    location: str
    appointment_date: datetime

    class Config:
        orm_mode = True

# --- APIエンドポイント ---

@app.get("/")
def read_root():
    return {"status": "Success", "message": "Repair App API is live!"}

# 予約登録API
@app.post("/appointments")
def create_appointment(item: AppointmentCreate):
    db = SessionLocal()
    db_item = Appointment(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    db.close()
    return db_item

# 予約一覧取得API（★カレンダー表示に必要）
@app.get("/appointments")
def get_appointments():
    db = SessionLocal()
    appointments = db.query(Appointment).all()
    db.close()
    return appointments
