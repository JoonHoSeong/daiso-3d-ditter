import sqlite3
import hashlib
import secrets
import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "daiso.db"

def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # 2. User sessions / tokens table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_tokens (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 3. Saved Drawers table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS saved_drawers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT DEFAULT '개인 서랍',
        width REAL NOT NULL,
        depth REAL NOT NULL,
        height REAL NOT NULL,
        items_json TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    conn.commit()
    conn.close()

# Password hashing with PBKDF2 HMAC SHA-256
def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return pw_hash, salt

def create_user(email: str, username: str, password: str) -> Dict[str, Any]:
    email = email.strip().lower()
    username = username.strip()
    if not email or not username or not password:
        raise ValueError("이메일, 닉네임, 비밀번호는 필수 입력 항목입니다.")

    pw_hash, salt = hash_password(password)
    user_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (id, email, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, email, username, pw_hash, salt, now)
        )
        conn.commit()
        return {"id": user_id, "email": email, "username": username, "created_at": now}
    except sqlite3.IntegrityError:
        raise ValueError("이미 가입된 이메일 주소입니다.")
    finally:
        conn.close()

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    email = email.strip().lower()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, username, password_hash, salt FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    user_id, db_email, username, stored_hash, salt = row['id'], row['email'], row['username'], row['password_hash'], row['salt']
    calc_hash, _ = hash_password(password, salt)
    if calc_hash == stored_hash:
        return {"id": user_id, "email": db_email, "username": username}
    return None

def create_user_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    now = datetime.now().isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO user_tokens (token, user_id, created_at) VALUES (?, ?, ?)", (token, user_id, now))
    conn.commit()
    conn.close()
    return token

def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.email, u.username, u.created_at
        FROM users u
        JOIN user_tokens t ON u.id = t.user_id
        WHERE t.token = ?
    """, (token,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"id": row['id'], "email": row['email'], "username": row['username'], "created_at": row['created_at']}
    return None

def delete_user_token(token: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_tokens WHERE token = ?", (token,))
    conn.commit()
    conn.close()

# Saved Drawers CRUD
def save_user_drawer(
    user_id: str,
    name: str,
    width: float,
    depth: float,
    height: float,
    items: Optional[List[Dict[str, Any]]] = None,
    category: str = "개인 서랍",
    drawer_id: Optional[str] = None
) -> Dict[str, Any]:
    name = name.strip()
    if not name:
        name = f"서랍 ({width}x{depth}x{height}cm)"

    items_json = json.dumps(items or [], ensure_ascii=False)
    now = datetime.now().isoformat()
    conn = get_connection()
    cursor = conn.cursor()

    if drawer_id:
        cursor.execute("""
            UPDATE saved_drawers
            SET name = ?, width = ?, depth = ?, height = ?, items_json = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        """, (name, width, depth, height, items_json, now, drawer_id, user_id))
        target_id = drawer_id
    else:
        target_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO saved_drawers (id, user_id, name, category, width, depth, height, items_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (target_id, user_id, name, category, width, depth, height, items_json, now, now))

    conn.commit()
    conn.close()

    return {
        "id": target_id,
        "userId": user_id,
        "name": name,
        "category": category,
        "width": width,
        "depth": depth,
        "height": height,
        "items": items or [],
        "updatedAt": now
    }

def get_user_drawers(user_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, user_id, name, category, width, depth, height, items_json, created_at, updated_at
        FROM saved_drawers
        WHERE user_id = ?
        ORDER BY updated_at DESC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        try:
            parsed_items = json.loads(r['items_json'])
        except Exception:
            parsed_items = []
        results.append({
            "id": r['id'],
            "userId": r['user_id'],
            "name": r['name'],
            "category": r['category'],
            "width": r['width'],
            "depth": r['depth'],
            "height": r['height'],
            "items": parsed_items,
            "createdAt": r['created_at'],
            "updatedAt": r['updated_at']
        })
    return results

def delete_user_drawer(user_id: str, drawer_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM saved_drawers WHERE id = ? AND user_id = ?", (drawer_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

# Initialize DB on load
init_db()
