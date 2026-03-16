import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime

DB_HOST = os.getenv("DB_HOST", "temco-admin-mariadb")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "ijts_recovery_db")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

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


def get_session():
    """Get a new database session."""
    return SessionLocal()
