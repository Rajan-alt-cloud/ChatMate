from pydantic import BaseModel


class MessageCreate(BaseModel):
    content: str
    receiver_id: int

class Message(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    is_read: bool
    is_delivered: bool
    content: str

class MessageUpdate(BaseModel):
    content: str
    is_read: bool
    is_delivered: bool

    class Config:
        from_attributes = True

