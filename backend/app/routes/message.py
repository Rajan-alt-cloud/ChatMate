from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.message import Message
from app.models.user import User
from app.schemas.message import MessageCreate, MessageUpdate

router = APIRouter(
    prefix="/messages",
    tags=["Messages"]
)

# --------------------------------------------------
# Response Schema (Updated with Attachment Fields)
# --------------------------------------------------
class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: Optional[str] = None
    attachment_url: Optional[str] = None
    file_type: Optional[str] = None
    file_name: Optional[str] = None
    created_at: datetime
    is_delivered: bool
    is_read: bool

    class Config:
        from_attributes = True


# --------------------------------------------------
# 1. Send a message (POST /messages)
# --------------------------------------------------
@router.post("", response_model=MessageResponse)
@router.post("/", response_model=MessageResponse)
def send_message(
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_message = Message(
        sender_id=current_user.id,
        receiver_id=message.receiver_id,
        content=message.content,
        attachment_url=getattr(message, "attachment_url", None),
        file_type=getattr(message, "file_type", None),
        file_name=getattr(message, "file_name", None),
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    return new_message


# --------------------------------------------------
# 2. Get all messages of current user (GET /messages)
# --------------------------------------------------
@router.get("", response_model=List[MessageResponse])
@router.get("/", response_model=List[MessageResponse])
def get_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    messages = db.query(Message).filter(
        or_(
            Message.sender_id == current_user.id,
            Message.receiver_id == current_user.id
        )
    ).all()
    return messages


# --------------------------------------------------
# 3. Get unread messages (GET /messages/unread)
# --------------------------------------------------
@router.get("/unread", response_model=List[MessageResponse])
def get_unread_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    unread_messages = db.query(Message).filter(
        and_(
            Message.receiver_id == current_user.id,
            Message.is_read == False
        )
    ).all()
    return unread_messages


# --------------------------------------------------
# 4. Get unread messages count (GET /messages/unread/count)
# --------------------------------------------------
@router.get("/unread/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    unread_count = db.query(Message).filter(
        and_(
            Message.receiver_id == current_user.id,
            Message.is_read == False
        )
    ).count()
    return {"unread_count": unread_count}


# --------------------------------------------------
# 5. Get unread count for a specific user (GET /messages/unread/count/{user_id})
# --------------------------------------------------
@router.get("/unread/count/{user_id}")
def get_unread_count_for_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    unread_count = db.query(Message).filter(
        and_(
            Message.sender_id == user_id,
            Message.receiver_id == current_user.id,
            Message.is_read == False
        )
    ).count()
    return {
        "from_user_id": user_id,
        "to_user_id": current_user.id,
        "unread_count": unread_count
    }


# --------------------------------------------------
# 6. Get unread messages for a specific user (GET /messages/unread/{user_id})
# --------------------------------------------------
@router.get("/unread/{user_id}", response_model=List[MessageResponse])
def get_unread_messages_for_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to view unread messages for this user"
        )

    unread_messages = db.query(Message).filter(
        and_(
            Message.receiver_id == current_user.id,
            Message.is_read == False
        )
    ).all()
    return unread_messages


# --------------------------------------------------
# 7. Get conversation with Pagination (GET /messages/user/{user_id})
# --------------------------------------------------
@router.get("/user/{user_id}", response_model=List[MessageResponse])
def get_conversation(
    user_id: int,
    skip: int = 0,
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch most recent messages slice
    messages = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
                and_(Message.sender_id == user_id, Message.receiver_id == current_user.id)
            )
        )
        .order_by(Message.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    # Reverse to return chronological order (oldest to newest) to frontend
    return messages[::-1]


# --------------------------------------------------
# 8. Chat History Endpoint (GET /messages/history/{user1_id}/{user2_id})
# --------------------------------------------------
@router.get("/history/{user1_id}/{user2_id}", response_model=List[MessageResponse])
def get_chat_history(
    user1_id: int, 
    user2_id: int, 
    db: Session = Depends(get_db)
):
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == user1_id, Message.receiver_id == user2_id),
            and_(Message.sender_id == user2_id, Message.receiver_id == user1_id)
        )
    ).order_by(Message.created_at.asc()).all()
    return messages


# --------------------------------------------------
# 9. Mark message as read (PATCH /messages/{message_id}/read)
# --------------------------------------------------
@router.patch("/{message_id}/read", response_model=MessageResponse)
def mark_message_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.receiver_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to mark this message as read"
        )

    message.is_read = True
    db.commit()
    db.refresh(message)
    return message


# --------------------------------------------------
# 10. Get specific message (GET /messages/{message_id})
# --------------------------------------------------
@router.get("/{message_id}", response_model=MessageResponse)
def get_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.sender_id != current_user.id and message.receiver_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access this message"
        )
    return message


# --------------------------------------------------
# 11. Update message (PUT /messages/{message_id})
# --------------------------------------------------
@router.put("/{message_id}", response_model=MessageResponse)
def update_message(
    message_id: int,
    message_update: MessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.sender_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this message"
        )

    message.content = message_update.content
    db.commit()
    db.refresh(message)
    return message


# --------------------------------------------------
# 12. Delete message (DELETE /messages/{message_id})
# --------------------------------------------------
@router.delete("/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.sender_id != current_user.id and message.receiver_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this message"
        )

    db.delete(message)
    db.commit()
    return {"detail": "Message deleted successfully"}