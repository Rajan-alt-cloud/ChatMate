import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.dependencies import get_current_user
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token
)

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# --------------------------------------------------
# Create User
# --------------------------------------------------
@router.post("/users")
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    new_user = User(
        username=user.username,
        email=user.email,
        password=hash_password(user.password),
        avatar_url=None
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# --------------------------------------------------
# Login
# --------------------------------------------------
@router.post("/login")
def login(
    user: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    db_user = db.query(User).filter(
        User.username == user.username
    ).first()

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not verify_password(
        user.password,
        db_user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    # User online
    db_user.is_online = True
    db.commit()
    db.refresh(db_user)

    access_token = create_access_token(
        data={"sub": db_user.username}
    )

    return {
        "detail": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
        "avatar_url": db_user.avatar_url
    }


# --------------------------------------------------
# Logout
# --------------------------------------------------
@router.post("/logout")
def logout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.is_online = False
    current_user.last_seen = datetime.now(timezone.utc)

    db.commit()
    db.refresh(current_user)

    return {
        "details": "Logout Successful!",
        "is_online": current_user.is_online,
        "last_seen": current_user.last_seen
    }


# --------------------------------------------------
# Upload & Update Avatar
# IMPORTANT: Placed before /users/{user_id}
# --------------------------------------------------
@router.post("/users/me/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed"
        )

    ext = os.path.splitext(file.filename)[1] or ".png"
    unique_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Static URL path
    avatar_url = f"http://localhost:8000/uploads/{unique_filename}"
    
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "avatar_url": current_user.avatar_url,
        "is_online": current_user.is_online,
        "last_seen": current_user.last_seen
    }


# --------------------------------------------------
# Get Online Users
# IMPORTANT: Must come before /users/{user_id}
# --------------------------------------------------
@router.get("/users/online")
def get_online_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    online_users = db.query(User).filter(
        User.is_online == True,
        User.id != current_user.id
    ).all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "is_online": user.is_online,
            "last_seen": user.last_seen
        }
        for user in online_users
    ]


# --------------------------------------------------
# Get All Users
# --------------------------------------------------
@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    users = db.query(User).filter(User.id != current_user.id).all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "is_online": user.is_online,
            "last_seen": user.last_seen
        }
        for user in users
    ]


# --------------------------------------------------
# Get User By ID
# --------------------------------------------------
@router.get("/users/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if current_user.id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access this user"
        )

    return user


# --------------------------------------------------
# Update User
# --------------------------------------------------
@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if current_user.id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this user"
        )

    user.username = user_update.username
    user.email = user_update.email
    user.password = hash_password(user_update.password)
    user.is_active = user_update.is_active

    db.commit()
    db.refresh(user)

    return user


# --------------------------------------------------
# Delete User
# --------------------------------------------------
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if current_user.id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this user"
        )

    db.delete(user)
    db.commit()

    return {
        "detail": "User deleted successfully"
    }


# --------------------------------------------------
# Profile
# --------------------------------------------------
@router.get("/profile")
def profile(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "avatar_url": current_user.avatar_url,
        "is_online": current_user.is_online,
        "last_seen": current_user.last_seen
    }