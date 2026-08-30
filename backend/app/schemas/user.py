from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserUpdate(BaseModel):
    username: str
    email: str
    password: str
    is_active: bool

class UserDelete(BaseModel):
    id: int 

class UserLogin(BaseModel):
    username: str
    password: str