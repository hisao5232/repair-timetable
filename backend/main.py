from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import datetime as dt

app = FastAPI(title="Repair-Time API")

# --- CORS設定 ---
# セキュリティのため、将来的に "*" を Cloudflare Pages のドメインに書き換えることを推奨します
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- データベース設定 ---
# 環境変数が取得できない場合のフォールバック（開発用）を含めておくと安全です
db_user = os.getenv('POSTGRES_USER', 'postgres')
db_pass = os.getenv('POSTGRES_PASSWORD', 'password')
db_host = os.getenv('DB_HOST', 'localhost')
db_name = os.getenv('POSTGRES_DB', 'repair_db')

db_url = f"postgresql://{db_user}:{db_pass}@{db_host}/{db_name}"
engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- ログイン設定 (環境変数から取得) ---
# .env の値を取得
ADMIN_USER = os.getenv("ADMIN_USER")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
USER_NAME = os.getenv("USER_NAME")
USER_PASSWORD = os.getenv("USER_PASSWORD")

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
    received_by = Column(String, nullable=True)
    is_own_lease = Column(Boolean, default=False)
    lease_location = Column(String, nullable=True)
    cause_categories = Column(String, nullable=True) 

# テーブル作成
Base.metadata.create_all(bind=engine)

# --- 2. Pydanticモデル ---
# ログイン用
class LoginRequest(BaseModel):
    username: str
    password: str

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
    cause_categories: str | None = None
    model_config = ConfigDict(from_attributes=True)

# --- 依存関係: DBセッション ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 3. APIエンドポイント ---

@app.get("/")
def read_root():
    return {"message": "Repair-Time API is running", "timestamp": dt.datetime.now()}

# --- 追加: ログインエンドポイント ---
@app.post("/login")
def login(request: LoginRequest):
    # .env から読み込んだ値と比較
    is_admin = (request.username == ADMIN_USER and request.password == ADMIN_PASSWORD)
    is_user = (request.username == USER_NAME and request.password == USER_PASSWORD)

    if is_admin or is_user:
        return {
            "username": request.username,
            "is_admin": is_admin,
            "status": "success"
        }
    else:
        # 認証失敗
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザー名またはパスワードが正しくありません"
        )

@app.post("/appointments", status_code=status.HTTP_201_CREATED)
def create_appointment(item: AppointmentCreate, db: Session = Depends(get_db)):
    db_item = Appointment(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/appointments")
def get_appointments(
    category: str | None = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Appointment)
    if category:
        query = query.filter(Appointment.cause_categories.contains(category))
    return query.order_by(Appointment.appointment_date).all()

@app.patch("/appointments/{app_id}")
def update_appointment(app_id: int, item: AppointmentUpdate, db: Session = Depends(get_db)):
    db_item = db.query(Appointment).filter(Appointment.id == app_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="指定された予約が見つかりません")
    
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
        raise HTTPException(status_code=404, detail="指定された予約が見つかりません")
    db.delete(db_item)
    db.commit()
    return {"message": "Successfully deleted"}
    