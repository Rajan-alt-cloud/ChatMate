import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(prefix="/upload", tags=["Upload"])

# Absolute path for uploads
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # app/routes
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(BASE_DIR)), "uploads") # backend/uploads

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "pdf", "docx", "txt"}

@router.post("")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename
    ext = filename.split(".")[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not supported")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    unique_filename = f"{uuid.uuid4().hex[:8]}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"http://127.0.0.1:8000/uploads/{unique_filename}"
    file_type = "image" if ext in {"png", "jpg", "jpeg", "gif", "webp"} else "file"

    return {
        "url": file_url,
        "file_name": filename,
        "file_type": file_type
    }