import sqlite3
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "health_monitor.db")
JWT_SECRET = os.environ.get("JWT_SECRET", "ai-emotion-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


def get_connection():
    """Get a SQLite connection with row_factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize the database tables."""
    conn = get_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            avatar_emoji TEXT DEFAULT '😊',
            auto_save INTEGER DEFAULT 1,
            default_interval INTEGER DEFAULT 5000,
            theme TEXT DEFAULT 'dark',
            created_at TEXT NOT NULL
        )
    """)

    # Detections table (linked to user)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS detections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            source TEXT DEFAULT 'webcam',
            dominant_emotion TEXT NOT NULL,
            emotions TEXT NOT NULL,
            confidence REAL NOT NULL,
            tips TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_detections_user ON detections(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_detections_emotion ON detections(dominant_emotion)")

    conn.commit()
    conn.close()


# ─── Password Hashing (using hashlib — no extra deps) ────────

def hash_password(password: str) -> str:
    """Hash password with salt using SHA-256."""
    salt = secrets.token_hex(16)
    hash_val = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{hash_val}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash."""
    try:
        salt, hash_val = stored_hash.split(":")
        return hashlib.sha256((salt + password).encode()).hexdigest() == hash_val
    except ValueError:
        return False


# ─── Simple JWT (no external deps) ───────────────────────────

import base64
import hmac

def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

def _b64_decode(data: str) -> bytes:
    padding = 4 - len(data) % 4
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data)

def create_token(user_id: int, username: str) -> str:
    """Create a simple JWT-like token."""
    header = _b64_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload_data = {
        "user_id": user_id,
        "username": username,
        "exp": (datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)).isoformat()
    }
    payload = _b64_encode(json.dumps(payload_data).encode())
    signature = hmac.new(JWT_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
    return f"{header}.{payload}.{signature}"


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT-like token. Returns payload or None."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header, payload, signature = parts

        # Verify signature
        expected_sig = hmac.new(JWT_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None

        # Decode payload
        payload_data = json.loads(_b64_decode(payload))

        # Check expiry
        exp = datetime.fromisoformat(payload_data["exp"])
        if datetime.utcnow() > exp:
            return None

        return payload_data
    except Exception:
        return None


# ─── User CRUD ────────────────────────────────────────────────

def create_user(username: str, email: str, password: str) -> dict:
    """Register a new user."""
    conn = get_connection()
    cursor = conn.cursor()

    # Check if username or email exists
    cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (username, email))
    if cursor.fetchone():
        conn.close()
        raise ValueError("Username or email already taken")

    password_hashed = hash_password(password)
    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO users (username, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
    """, (username, email, password_hashed, now))

    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    token = create_token(user_id, username)
    return {
        "user_id": user_id,
        "username": username,
        "email": email,
        "token": token
    }


def login_user(username: str, password: str) -> dict:
    """Login with username and password."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise ValueError("Invalid username or password")

    if not verify_password(password, row["password_hash"]):
        raise ValueError("Invalid username or password")

    token = create_token(row["id"], row["username"])
    return {
        "user_id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "avatar_emoji": row["avatar_emoji"],
        "token": token
    }


def get_user_by_id(user_id: int) -> Optional[dict]:
    """Get user by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "avatar_emoji": row["avatar_emoji"],
            "auto_save": bool(row["auto_save"]),
            "default_interval": row["default_interval"],
            "theme": row["theme"],
            "created_at": row["created_at"]
        }
    return None


# ─── Detection CRUD (user-scoped) ────────────────────────────

def save_detection(user_id: int, dominant_emotion: str, emotions: dict, confidence: float,
                   tips: dict = None, source: str = "webcam") -> dict:
    """Save a detection result to the database."""
    conn = get_connection()
    cursor = conn.cursor()
    timestamp = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO detections (user_id, timestamp, source, dominant_emotion, emotions, confidence, tips)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        timestamp,
        source,
        dominant_emotion,
        json.dumps(emotions),
        confidence,
        json.dumps(tips) if tips else None
    ))

    detection_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": detection_id,
        "timestamp": timestamp,
        "source": source,
        "dominant_emotion": dominant_emotion,
        "emotions": emotions,
        "confidence": confidence,
        "tips": tips
    }


def get_detections(
    user_id: int,
    limit: int = 50,
    offset: int = 0,
    emotion: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
) -> dict:
    """Get detection history with optional filters for a specific user."""
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM detections WHERE user_id = ?"
    count_query = "SELECT COUNT(*) as total FROM detections WHERE user_id = ?"
    params = [user_id]
    count_params = [user_id]

    if emotion:
        query += " AND dominant_emotion = ?"
        count_query += " AND dominant_emotion = ?"
        params.append(emotion)
        count_params.append(emotion)

    if date_from:
        query += " AND timestamp >= ?"
        count_query += " AND timestamp >= ?"
        params.append(date_from)
        count_params.append(date_from)

    if date_to:
        query += " AND timestamp <= ?"
        count_query += " AND timestamp <= ?"
        params.append(date_to)
        count_params.append(date_to)

    # Get total count
    cursor.execute(count_query, count_params)
    total = cursor.fetchone()["total"]

    # Get paginated results
    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()

    detections = []
    for row in rows:
        detections.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "source": row["source"],
            "dominant_emotion": row["dominant_emotion"],
            "emotions": json.loads(row["emotions"]),
            "confidence": row["confidence"],
            "tips": json.loads(row["tips"]) if row["tips"] else None
        })

    conn.close()

    return {
        "detections": detections,
        "total": total,
        "limit": limit,
        "offset": offset
    }


def get_stats(user_id: int) -> dict:
    """Get dashboard statistics for a specific user."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM detections WHERE user_id = ?", (user_id,))
    total_scans = cursor.fetchone()["total"]

    if total_scans == 0:
        conn.close()
        return {
            "total_scans": 0,
            "today_scans": 0,
            "most_frequent_emotion": "neutral",
            "avg_confidence": 0,
            "emotion_distribution": {},
            "weekly_trend": [],
            "recent_detections": [],
            "mood_streak": 0
        }

    today = datetime.utcnow().strftime("%Y-%m-%d")
    cursor.execute("SELECT COUNT(*) as today FROM detections WHERE user_id = ? AND timestamp LIKE ?",
                   (user_id, f"{today}%"))
    today_scans = cursor.fetchone()["today"]

    cursor.execute("""
        SELECT dominant_emotion, COUNT(*) as cnt FROM detections
        WHERE user_id = ? GROUP BY dominant_emotion ORDER BY cnt DESC LIMIT 1
    """, (user_id,))
    row = cursor.fetchone()
    most_frequent = row["dominant_emotion"] if row else "neutral"

    cursor.execute("SELECT AVG(confidence) as avg_conf FROM detections WHERE user_id = ?", (user_id,))
    avg_confidence = cursor.fetchone()["avg_conf"] or 0

    cursor.execute("""
        SELECT dominant_emotion, COUNT(*) as cnt FROM detections
        WHERE user_id = ? GROUP BY dominant_emotion ORDER BY cnt DESC
    """, (user_id,))
    emotion_distribution = {}
    for row in cursor.fetchall():
        emotion_distribution[row["dominant_emotion"]] = row["cnt"]

    weekly_trend = []
    for i in range(6, -1, -1):
        day = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT dominant_emotion, COUNT(*) as cnt FROM detections
            WHERE user_id = ? AND timestamp LIKE ?
            GROUP BY dominant_emotion ORDER BY cnt DESC LIMIT 1
        """, (user_id, f"{day}%"))
        row = cursor.fetchone()
        cursor.execute("SELECT COUNT(*) as total FROM detections WHERE user_id = ? AND timestamp LIKE ?",
                       (user_id, f"{day}%"))
        day_total = cursor.fetchone()["total"]
        weekly_trend.append({
            "date": day,
            "dominant_emotion": row["dominant_emotion"] if row else None,
            "count": day_total
        })

    cursor.execute("SELECT * FROM detections WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5", (user_id,))
    recent = []
    for row in cursor.fetchall():
        recent.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "source": row["source"],
            "dominant_emotion": row["dominant_emotion"],
            "confidence": row["confidence"]
        })

    # Mood streak
    cursor.execute("""
        SELECT DISTINCT substr(timestamp, 1, 10) as day, dominant_emotion
        FROM detections WHERE user_id = ? ORDER BY day DESC
    """, (user_id,))
    streak = 0
    positive_emotions = {"happy", "surprise", "neutral"}
    prev_day = None
    for row in cursor.fetchall():
        day = row["day"]
        if prev_day and prev_day != day:
            if row["dominant_emotion"] in positive_emotions:
                streak += 1
            else:
                break
        elif not prev_day:
            if row["dominant_emotion"] in positive_emotions:
                streak = 1
            else:
                break
        prev_day = day

    conn.close()

    return {
        "total_scans": total_scans,
        "today_scans": today_scans,
        "most_frequent_emotion": most_frequent,
        "avg_confidence": round(avg_confidence, 4),
        "emotion_distribution": emotion_distribution,
        "weekly_trend": weekly_trend,
        "recent_detections": recent,
        "mood_streak": streak
    }


def delete_detection(user_id: int, detection_id: int) -> bool:
    """Delete a single detection by ID for a specific user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM detections WHERE id = ? AND user_id = ?", (detection_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0


def clear_detections(user_id: int) -> int:
    """Clear all detections for a specific user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as total FROM detections WHERE user_id = ?", (user_id,))
    total = cursor.fetchone()["total"]
    cursor.execute("DELETE FROM detections WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return total


def export_detections(user_id: int) -> list:
    """Export all detections for a specific user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM detections WHERE user_id = ? ORDER BY timestamp DESC", (user_id,))
    rows = cursor.fetchall()

    data = []
    for row in rows:
        data.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "source": row["source"],
            "dominant_emotion": row["dominant_emotion"],
            "emotions": json.loads(row["emotions"]),
            "confidence": row["confidence"],
            "tips": json.loads(row["tips"]) if row["tips"] else None
        })

    conn.close()
    return data


# ─── Profile CRUD (user-scoped) ──────────────────────────────

def get_profile(user_id: int) -> dict:
    """Get user profile."""
    user = get_user_by_id(user_id)
    if user:
        return {
            "username": user["username"],
            "email": user["email"],
            "avatar_emoji": user["avatar_emoji"],
            "auto_save": user["auto_save"],
            "default_interval": user["default_interval"],
            "theme": user["theme"],
            "created_at": user["created_at"]
        }
    return {
        "username": "User",
        "email": "",
        "avatar_emoji": "😊",
        "auto_save": True,
        "default_interval": 5000,
        "theme": "dark"
    }


def update_profile(
    user_id: int,
    avatar_emoji: Optional[str] = None,
    auto_save: Optional[bool] = None,
    default_interval: Optional[int] = None,
    theme: Optional[str] = None
) -> dict:
    """Update user profile fields."""
    conn = get_connection()
    cursor = conn.cursor()

    updates = []
    params = []

    if avatar_emoji is not None:
        updates.append("avatar_emoji = ?")
        params.append(avatar_emoji)
    if auto_save is not None:
        updates.append("auto_save = ?")
        params.append(1 if auto_save else 0)
    if default_interval is not None:
        updates.append("default_interval = ?")
        params.append(default_interval)
    if theme is not None:
        updates.append("theme = ?")
        params.append(theme)

    if updates:
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()

    conn.close()
    return get_profile(user_id)
