import os
from fastapi import FastAPI, Query, Request, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

import emotion as emotion_module
import tips as tips_module
import database as db

# Initialize database on startup
db.init_db()

app = FastAPI(
    title="AI-Emotion_Detection",
    description="Detect facial emotions with webcam/upload. Health monitoring dashboard with auth.",
    version="3.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Auth Helper — extract user from token
# ─────────────────────────────────────────────

def get_current_user(request: Request) -> dict:
    """Extract and verify user from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth_header.split(" ", 1)[1]
    payload = db.verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.get_user_by_id(payload["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# ─────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class WebcamRequest(BaseModel):
    image_base64: str

class ProfileUpdate(BaseModel):
    avatar_emoji: Optional[str] = None
    auto_save: Optional[bool] = None
    default_interval: Optional[int] = None
    theme: Optional[str] = None


# ─────────────────────────────────────────────
# Auth Routes
# ─────────────────────────────────────────────

@app.post("/auth/register")
def register(req: RegisterRequest):
    if len(req.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if "@" not in req.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    try:
        result = db.create_user(req.username, req.email, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/login")
def login(req: LoginRequest):
    try:
        result = db.login_user(req.username, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.get("/auth/me")
def get_me(request: Request):
    user = get_current_user(request)
    return {
        "user_id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "avatar_emoji": user["avatar_emoji"]
    }


# ─────────────────────────────────────────────
# Emotion Detection Routes
# ─────────────────────────────────────────────

@app.post("/emotion/detect-webcam")
def detect_from_webcam(payload: WebcamRequest, request: Request):
    user = get_current_user(request)
    result = emotion_module.detect_emotion_from_base64(payload.image_base64)
    emotion_tips = tips_module.get_tips_for_emotion(result["dominant_emotion"])

    response = {
        **result,
        "tips": emotion_tips,
        "timestamp": datetime.utcnow().isoformat()
    }

    # Auto-save if user has it enabled
    profile = db.get_profile(user["id"])
    if profile.get("auto_save", True) and result.get("success", False):
        saved = db.save_detection(
            user_id=user["id"],
            dominant_emotion=result["dominant_emotion"],
            emotions=result.get("emotions", {}),
            confidence=result.get("confidence", 0),
            tips=emotion_tips,
            source="webcam"
        )
        response["saved_id"] = saved["id"]

    return response


@app.post("/emotion/detect-upload")
async def detect_from_upload(request: Request, file: UploadFile = File(...)):
    user = get_current_user(request)

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPEG, PNG, WebP, GIF, or BMP.")

    # Read file bytes
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB.")

    result = emotion_module.detect_emotion_from_bytes(image_bytes)
    emotion_tips = tips_module.get_tips_for_emotion(result["dominant_emotion"])

    response = {
        **result,
        "tips": emotion_tips,
        "timestamp": datetime.utcnow().isoformat(),
        "filename": file.filename
    }

    # Auto-save
    profile = db.get_profile(user["id"])
    if profile.get("auto_save", True) and result.get("success", False):
        saved = db.save_detection(
            user_id=user["id"],
            dominant_emotion=result["dominant_emotion"],
            emotions=result.get("emotions", {}),
            confidence=result.get("confidence", 0),
            tips=emotion_tips,
            source="upload"
        )
        response["saved_id"] = saved["id"]

    return response


@app.get("/tips/{emotion}")
def get_tips(emotion: str):
    return tips_module.get_tips_for_emotion(emotion)


# ─────────────────────────────────────────────
# Detection History Routes
# ─────────────────────────────────────────────

@app.get("/detections")
def get_detections(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    emotion: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    user = get_current_user(request)
    return db.get_detections(
        user_id=user["id"],
        limit=limit,
        offset=offset,
        emotion=emotion,
        date_from=date_from,
        date_to=date_to
    )


@app.get("/detections/stats")
def get_detection_stats(request: Request):
    user = get_current_user(request)
    return db.get_stats(user["id"])


@app.get("/detections/export")
def export_detections(request: Request):
    user = get_current_user(request)
    return db.export_detections(user["id"])


@app.delete("/detections")
def clear_detections(request: Request):
    user = get_current_user(request)
    count = db.clear_detections(user["id"])
    return {"message": f"Cleared {count} detections", "count": count}


@app.delete("/detections/{detection_id}")
def delete_detection(detection_id: int, request: Request):
    user = get_current_user(request)
    success = db.delete_detection(user["id"], detection_id)
    if success:
        return {"message": "Detection deleted", "id": detection_id}
    return {"message": "Detection not found", "id": detection_id}


# ─────────────────────────────────────────────
# Profile Routes
# ─────────────────────────────────────────────

@app.get("/profile")
def get_profile(request: Request):
    user = get_current_user(request)
    return db.get_profile(user["id"])


@app.put("/profile")
def update_profile(profile: ProfileUpdate, request: Request):
    user = get_current_user(request)
    return db.update_profile(
        user_id=user["id"],
        avatar_emoji=profile.avatar_emoji,
        auto_save=profile.auto_save,
        default_interval=profile.default_interval,
        theme=profile.theme
    )


# ─────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "3.0.0", "timestamp": datetime.utcnow().isoformat()}


# Serve the frontend
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
