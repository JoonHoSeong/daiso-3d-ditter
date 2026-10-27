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
        provider TEXT DEFAULT 'local',
        provider_id TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        created_at TEXT NOT NULL
    )
    """)

    # Migrate columns if existing table lacks social fields
    cursor.execute("PRAGMA table_info(users)")
    user_cols = [r[1] for r in cursor.fetchall()]
    if "provider" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local'")
    if "provider_id" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN provider_id TEXT DEFAULT ''")
    if "avatar_url" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''")

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
            "INSERT INTO users (id, email, username, password_hash, salt, provider, provider_id, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, 'local', '', '', ?)",
            (user_id, email, username, pw_hash, salt, now)
        )
        conn.commit()
        return {"id": user_id, "email": email, "username": username, "provider": "local", "avatar_url": "", "created_at": now}
    except sqlite3.IntegrityError:
        raise ValueError("이미 가입된 이메일 주소입니다.")
    finally:
        conn.close()

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    email = email.strip().lower()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, username, password_hash, salt, provider, avatar_url FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    user_id = row['id']
    db_email = row['email']
    username = row['username']
    stored_hash = row['password_hash']
    salt = row['salt']
    provider = row['provider'] if 'provider' in row.keys() else 'local'
    avatar_url = row['avatar_url'] if 'avatar_url' in row.keys() else ''

    calc_hash, _ = hash_password(password, salt)
    if calc_hash == stored_hash:
        return {"id": user_id, "email": db_email, "username": username, "provider": provider, "avatar_url": avatar_url}
    return None

def find_or_create_social_user(
    provider: str,
    provider_id: str,
    email: str,
    username: str,
    avatar_url: Optional[str] = ""
) -> Dict[str, Any]:
    """Finds an existing user by (provider, provider_id) or email, or registers a new social user."""
    provider = provider.strip().lower()
    provider_id = (provider_id or "").strip()
    email = email.strip().lower()
    username = username.strip() or f"{provider.capitalize()} 사용자"
    avatar_url = (avatar_url or "").strip()
    now = datetime.now().isoformat()

    conn = get_connection()
    cursor = conn.cursor()

    # 1. Check by (provider, provider_id) if provider_id is provided
    if provider_id:
        cursor.execute(
            "SELECT id, email, username, provider, avatar_url, created_at FROM users WHERE provider = ? AND provider_id = ?",
            (provider, provider_id)
        )
        row = cursor.fetchone()
        if row:
            # Update avatar or username if changed
            if avatar_url and avatar_url != row['avatar_url']:
                cursor.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (avatar_url, row['id']))
                conn.commit()
            conn.close()
            return {
                "id": row['id'],
                "email": row['email'],
                "username": row['username'],
                "provider": row['provider'],
                "avatar_url": avatar_url or row['avatar_url'],
                "created_at": row['created_at']
            }

    # 2. Check by email
    cursor.execute(
        "SELECT id, email, username, provider, provider_id, avatar_url, created_at FROM users WHERE email = ?",
        (email,)
    )
    row = cursor.fetchone()
    if row:
        # Link social account if not already linked
        user_id = row['id']
        update_fields = []
        params = []
        if not row['provider'] or row['provider'] == 'local':
            update_fields.append("provider = ?")
            params.append(provider)
        if provider_id and not row['provider_id']:
            update_fields.append("provider_id = ?")
            params.append(provider_id)
        if avatar_url and not row['avatar_url']:
            update_fields.append("avatar_url = ?")
            params.append(avatar_url)

        if update_fields:
            params.append(user_id)
            cursor.execute(f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?", tuple(params))
            conn.commit()

        conn.close()
        return {
            "id": user_id,
            "email": row['email'],
            "username": row['username'],
            "provider": provider if update_fields else (row['provider'] or 'local'),
            "avatar_url": avatar_url or (row['avatar_url'] or ""),
            "created_at": row['created_at']
        }

    # 3. Create brand new social user
    user_id = str(uuid.uuid4())
    cursor.execute(
        """
        INSERT INTO users (id, email, username, password_hash, salt, provider, provider_id, avatar_url, created_at)
        VALUES (?, ?, ?, '', '', ?, ?, ?, ?)
        """,
        (user_id, email, username, provider, provider_id, avatar_url, now)
    )
    conn.commit()
    conn.close()
    return {
        "id": user_id,
        "email": email,
        "username": username,
        "provider": provider,
        "avatar_url": avatar_url,
        "created_at": now
    }

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
        SELECT u.id, u.email, u.username, u.provider, u.avatar_url, u.created_at
        FROM users u
        JOIN user_tokens t ON u.id = t.user_id
        WHERE t.token = ?
    """, (token,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "id": row['id'],
            "email": row['email'],
            "username": row['username'],
            "provider": row['provider'] if 'provider' in row.keys() else 'local',
            "avatar_url": row['avatar_url'] if 'avatar_url' in row.keys() else '',
            "created_at": row['created_at']
        }
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
