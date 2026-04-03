import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

import emotion as emotion_module
import tips as tips_module

app = FastAPI(
    title="AI-Emotion_Detection",
    description="Detect facial emotions in real-time using your webcam",
    version="2.0.0"
)

# CORS - allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────

class WebcamRequest(BaseModel):
    image_base64: str

class EmotionResponse(BaseModel):
    success: bool
    dominant_emotion: str
    emotions: dict
    confidence: float
    tips: dict
    timestamp: str


# ─────────────────────────────────────────────
# Emotion Detection Routes
# ─────────────────────────────────────────────

@app.post("/emotion/detect-webcam")
def detect_from_webcam(payload: WebcamRequest):
    result = emotion_module.detect_emotion_from_base64(payload.image_base64)
    emotion_tips = tips_module.get_tips_for_emotion(result["dominant_emotion"])

    return {
        **result,
        "tips": emotion_tips,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/tips/{emotion}")
def get_tips(emotion: str):
    return tips_module.get_tips_for_emotion(emotion)


# Serve the frontend
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
