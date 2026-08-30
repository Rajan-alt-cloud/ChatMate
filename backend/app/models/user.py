from sqlalchemy import Column, Integer, String,Boolean, column,DateTime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    is_active = Column(Boolean, default=False)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime(timezone=True),nullable=False)
    # models/user.py
    avatar_url = Column(String, nullable=True)