import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base
from app.routes import user as user_routes
from app.routes import message as message_routes
from app.routes import websocket as websocket_routes
from app.routes import upload

app = FastAPI()

# Database Tables Create Karein
Base.metadata.create_all(bind=engine)

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes Register Karein
app.include_router(user_routes.router)
app.include_router(message_routes.router)
app.include_router(websocket_routes.router)
app.include_router(upload.router)

# Static Files Directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(os.path.dirname(BASE_DIR), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def home():
    return {"message": "Welcome to the FastAPI application!🚀"}