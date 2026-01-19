from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import datetime as dt

app = FastAPI()

# --- CORS設定 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- データベース設定 ---
db_url = f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('DB_HOST')}/{os.getenv('POSTGRES_DB')}"
engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 依存関係: DBセッションの取得 ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 1. データベースモデル ---
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
    created_at = Column(DateTime, default=dt.datetime.now)
    received_by = Column(String, nullable=True)        # 受付担当
    is_own_lease = Column(Boolean, default=False)      # 自社リース機フラグ
    lease_location = Column(String, nullable=True)     # リース拠点
    # ★追加: 故障原因カテゴリー (カンマ区切りの文字列で保存)
    cause_categories = Column(String, nullable=True)   

# テーブル作成
Base.metadata.create_all(bind=engine)

# --- 2. Pydanticモデル ---
class AppointmentCreate(BaseModel):
    customer_name: str
    contact_person: str
    phone_number: str
    machine_model: str
    serial_number: str
    failure_symptoms: str
    location: str
    appointment_date: datetime
    received_by: str | None = None
    is_own_lease: bool = False
    lease_location: str | None = None
    # ★追加
    cause_categories: str | None = None
    model_config = ConfigDict(from_attributes=True)

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
    received_by: str | None = None
    is_own_lease: bool = False
    lease_location: str | None = None
    # ★追加
    cause_categories: str | None = None
    model_config = ConfigDict(from_attributes=True)

# --- 3. APIエンドポイント ---

@app.get("/")
def read_root():
    return {"status": "Success"}

@app.post("/appointments")
def create_appointment(item: AppointmentCreate, db: Session = Depends(get_db)):
    db_item = Appointment(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/appointments")
def get_appointments(
    category: str | None = Query(None), # ★クエリパラメータでカテゴリー検索を可能に
    db: Session = Depends(get_db)
):
    """
    予約一覧を取得します。カテゴリーが指定されている場合はフィルタリングします。
    """
    query = db.query(Appointment)
    
    # カテゴリーによる絞り込みロジック
    if category:
        # DB内の cause_categories 文字列に、指定されたカテゴリーが含まれているか検索
        query = query.filter(Appointment.cause_categories.contains(category))
        
    return query.order_by(Appointment.appointment_date).all()

@app.patch("/appointments/{app_id}")
def update_appointment(app_id: int, item: AppointmentUpdate, db: Session = Depends(get_db)):
    db_item = db.query(Appointment).filter(Appointment.id == app_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not Found")
    
    # 送信されたデータをループしてDBモデルを更新
    update_data = item.model_dump()
    for key, value in update_data.items():
        setattr(db_item, key, value)
        
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/appointments/{app_id}")
def delete_appointment(app_id: int, db: Session = Depends(get_db)):
    db_item = db.query(Appointment).filter(Appointment.id == app_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not Found")
    db.delete(db_item)
    db.commit()
    return {"message": "Deleted"}
