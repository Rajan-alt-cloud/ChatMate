from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
SECRET_KEY = "your-secret-key"  # Replace with a strong secret key
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: int = 3600) -> str:
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(seconds=expires_delta)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)