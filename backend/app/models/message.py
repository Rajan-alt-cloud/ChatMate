from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, DateTime,func
from app.database import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    file_type = Column(String(50), nullable=True)   # 'image' ya 'file'
    file_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_read = Column(Boolean, default=False, nullable=False)  # 0 for unread, 1 for read
    is_delivered = Column(Boolean, default=False, nullable=False)  # 0 for undelivered, 1 for delivered