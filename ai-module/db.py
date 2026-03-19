import os
from urllib.parse import quote_plus
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime

DB_HOST = os.getenv("DB_HOST", "temco-admin-mariadb")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "ijts_recovery_db")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class AiUsage(Base):
    """Maps to ts_ai_usage table (to be created after user approval)."""
    __tablename__ = "ts_ai_usage"

    usage_id = Column(Integer, primary_key=True, autoincrement=True)
    gup_id = Column(Integer, nullable=False, index=True)
    request_type = Column(String(50), nullable=False)
    model_used = Column(String(50), nullable=False)
    tokens_used = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class AiConversation(Base):
    """Maps to ts_ai_conversation table (to be created after user approval)."""
    __tablename__ = "ts_ai_conversation"

    conversation_id = Column(Integer, primary_key=True, autoincrement=True)
    gup_id = Column(Integer, nullable=False, index=True)
    title = Column(String(255))
    language = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AiMessage(Base):
    """Maps to ts_ai_message table (to be created after user approval)."""
    __tablename__ = "ts_ai_message"

    message_id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, nullable=False, index=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class AiDoctorSession(Base):
    """Maps to ts_ai_doctor_session table."""
    __tablename__ = "ts_ai_doctor_session"

    session_id = Column(Integer, primary_key=True, autoincrement=True)
    gup_id = Column(Integer, nullable=False, index=True)
    instance_id = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="open")
    title = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime)


class AiDoctorMessage(Base):
    """Maps to ts_ai_doctor_message table."""
    __tablename__ = "ts_ai_doctor_message"

    message_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, nullable=False, index=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    command_executed = Column(String(500))
    command_output = Column(Text)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class AiDoctorQuota(Base):
    """Maps to ts_ai_doctor_quota table."""
    __tablename__ = "ts_ai_doctor_quota"

    quota_id = Column(Integer, primary_key=True, autoincrement=True)
    gup_id = Column(Integer, nullable=False)
    quota_date = Column(String(10), nullable=False)
    requests_used = Column(Integer, default=0)
    daily_limit = Column(Integer, default=50)


def get_session():
    """Get a new database session."""
    return SessionLocal()
