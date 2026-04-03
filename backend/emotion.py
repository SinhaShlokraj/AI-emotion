import numpy as np
import cv2
from PIL import Image
import io
import base64
from deepface import DeepFace
import json


EMOTIONS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]


def preprocess_image(img):
    """Light preprocessing for better emotion detection."""
    # Simple brightness/contrast adjustment
    alpha = 1.2  # contrast
    beta = 10    # brightness
    enhanced = cv2.convertScaleAbs(img, alpha=alpha, beta=beta)

    # Slight blur to reduce noise
    enhanced = cv2.GaussianBlur(enhanced, (3, 3), 0)

    return enhanced


def detect_emotion_from_bytes(image_bytes: bytes) -> dict:
    """Detect emotion from raw image bytes with preprocessing."""
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Could not decode image")

        # Light preprocessing
        img = preprocess_image(img)

        # Analyze with DeepFace
        result = DeepFace.analyze(
            img_path=img,
            actions=["emotion"],
            enforce_detection=True,  # Require face detection
            silent=True
        )

        # Handle list result (multiple faces)
        if isinstance(result, list):
            result = result[0]

        emotion_scores = result.get("emotion", {})
        dominant_emotion = result.get("dominant_emotion", "neutral")

        # Normalize scores
        normalized = {}
        max_score = max(emotion_scores.values()) if emotion_scores else 1

        for emotion in EMOTIONS:
            score = float(emotion_scores.get(emotion, 0.0))
            # DeepFace returns 0-100, normalize to 0-1
            normalized[emotion] = round(score / 100.0, 4)

        # Get confidence of dominant emotion (0-1 scale)
        dominant_score = normalized.get(dominant_emotion.lower(), 0.0)

        # Only trust results if dominant emotion has reasonable confidence
        if dominant_score < 0.3:  # Low confidence threshold
            dominant_emotion = "neutral"
            dominant_score = normalized.get("neutral", 0.0)

        return {
            "success": True,
            "dominant_emotion": dominant_emotion.lower(),
            "emotions": normalized,
            "confidence": dominant_score
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "dominant_emotion": "neutral",
            "emotions": {e: 0.0 for e in EMOTIONS},
            "confidence": 0.0
        }


def detect_emotion_from_base64(base64_str: str) -> dict:
    """Detect emotion from base64 encoded image (webcam frames)."""
    try:
        # Strip data URL header if present
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]

        image_bytes = base64.b64decode(base64_str)
        return detect_emotion_from_bytes(image_bytes)
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "dominant_emotion": "neutral",
            "emotions": {e: 0.0 for e in EMOTIONS},
            "confidence": 0.0
        }
