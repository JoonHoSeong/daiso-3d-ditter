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

    # Migrate columns if existing table lacks social or role fields
    cursor.execute("PRAGMA table_info(users)")
    user_cols = [r[1] for r in cursor.fetchall()]
    if "provider" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local'")
    if "provider_id" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN provider_id TEXT DEFAULT ''")
    if "avatar_url" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''")
    if "role" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")

    # Seed or sync default Administrator Account
    ensure_admin_user(cursor)

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

    # 4. Shared 3D Drawer Links table (KakaoTalk / Social Share)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shared_links (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        drawer_json TEXT NOT NULL,
        items_json TEXT NOT NULL,
        active_store_json TEXT DEFAULT '{}',
        active_purpose_json TEXT DEFAULT '{}',
        view_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)

    # 5. User Custom Space Presets table (Cloud Synced)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_custom_presets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        zone TEXT NOT NULL,
        category_label TEXT DEFAULT '내 맞춤 공간',
        width REAL NOT NULL,
        depth REAL NOT NULL,
        height REAL NOT NULL,
        description TEXT DEFAULT '',
        icon TEXT DEFAULT '🌟',
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

def ensure_admin_user(cursor=None):
    admin_email = "joonho1366@gmail.com"
    admin_pw = "StrongPassword123!"
    admin_username = "관리자 (Joonho)"

    close_conn = False
    if cursor is None:
        conn = get_connection()
        cursor = conn.cursor()
        close_conn = True
    else:
        conn = cursor.connection

    pw_hash, salt = hash_password(admin_pw)
    now = datetime.now().isoformat()

    cursor.execute("SELECT id, email FROM users WHERE email = ?", (admin_email,))
    existing = cursor.fetchone()
    if existing:
        cursor.execute(
            "UPDATE users SET password_hash = ?, salt = ?, role = 'admin', username = ? WHERE email = ?",
            (pw_hash, salt, admin_username, admin_email)
        )
    else:
        admin_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO users (id, email, username, password_hash, salt, provider, provider_id, avatar_url, role, created_at)
            VALUES (?, ?, ?, ?, ?, 'local', '', '', 'admin', ?)
            """,
            (admin_id, admin_email, admin_username, pw_hash, salt, now)
        )
    conn.commit()
    if close_conn:
        conn.close()

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
            "INSERT INTO users (id, email, username, password_hash, salt, provider, provider_id, avatar_url, role, created_at) VALUES (?, ?, ?, ?, ?, 'local', '', '', 'user', ?)",
            (user_id, email, username, pw_hash, salt, now)
        )
        conn.commit()
        return {"id": user_id, "email": email, "username": username, "provider": "local", "avatar_url": "", "role": "user", "created_at": now}
    except sqlite3.IntegrityError:
        raise ValueError("이미 가입된 이메일 주소입니다.")
    finally:
        conn.close()

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    email = email.strip().lower()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, username, password_hash, salt, provider, avatar_url, role FROM users WHERE email = ?", (email,))
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
    role = row['role'] if 'role' in row.keys() else 'user'

    calc_hash, _ = hash_password(password, salt)
    if calc_hash == stored_hash:
        return {"id": user_id, "email": db_email, "username": username, "provider": provider, "avatar_url": avatar_url, "role": role}
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
            "SELECT id, email, username, provider, avatar_url, role, created_at FROM users WHERE provider = ? AND provider_id = ?",
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
                "role": row['role'] if 'role' in row.keys() else 'user',
                "created_at": row['created_at']
            }

    # 2. Check by email
    cursor.execute(
        "SELECT id, email, username, provider, provider_id, avatar_url, role, created_at FROM users WHERE email = ?",
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
            "role": row['role'] if 'role' in row.keys() else 'user',
            "created_at": row['created_at']
        }

    # 3. Create brand new social user
    user_id = str(uuid.uuid4())
    cursor.execute(
        """
        INSERT INTO users (id, email, username, password_hash, salt, provider, provider_id, avatar_url, role, created_at)
        VALUES (?, ?, ?, '', '', ?, ?, ?, 'user', ?)
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
        "role": "user",
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
        SELECT u.id, u.email, u.username, u.provider, u.avatar_url, u.role, u.created_at
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
            "role": row['role'] if 'role' in row.keys() else 'user',
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

def update_user_drawer(
    user_id: str,
    drawer_id: str,
    name: Optional[str] = None,
    width: Optional[float] = None,
    depth: Optional[float] = None,
    height: Optional[float] = None,
    items: Optional[List[Dict[str, Any]]] = None,
    category: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM saved_drawers WHERE id = ? AND user_id = ?", (drawer_id, user_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    now = datetime.now().isoformat()
    new_name = name.strip() if name and name.strip() else row["name"]
    new_w = width if width is not None else row["width"]
    new_d = depth if depth is not None else row["depth"]
    new_h = height if height is not None else row["height"]
    new_items_json = json.dumps(items, ensure_ascii=False) if items is not None else row["items_json"]
    new_category = category if category is not None else row["category"]

    cursor.execute("""
        UPDATE saved_drawers
        SET name = ?, width = ?, depth = ?, height = ?, items_json = ?, category = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
    """, (new_name, new_w, new_d, new_h, new_items_json, new_category, now, drawer_id, user_id))
    conn.commit()
    conn.close()

    try:
        parsed_items = json.loads(new_items_json)
    except Exception:
        parsed_items = []

    return {
        "id": drawer_id,
        "userId": user_id,
        "name": new_name,
        "category": new_category,
        "width": new_w,
        "depth": new_d,
        "height": new_h,
        "items": parsed_items,
        "updatedAt": now
    }

def migrate_guest_drawers(user_id: str, guest_drawers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Imports guest/local drawers into user's DB account upon login."""
    if not guest_drawers:
        return get_user_drawers(user_id)

    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()

    # Get existing drawer names to avoid exact duplicates
    cursor.execute("SELECT name FROM saved_drawers WHERE user_id = ?", (user_id,))
    existing_names = {r["name"] for r in cursor.fetchall()}

    for d in guest_drawers:
        name = (d.get("name") or "").strip()
        if not name or name in existing_names:
            continue

        w = float(d.get("width", 32.0))
        depth = float(d.get("depth", 40.0))
        h = float(d.get("height", 7.0))
        items = d.get("items") or []
        items_json = json.dumps(items, ensure_ascii=False)
        cat = d.get("category") or "개인 서랍"
        new_id = str(uuid.uuid4())

        cursor.execute("""
            INSERT INTO saved_drawers (id, user_id, name, category, width, depth, height, items_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (new_id, user_id, name, cat, w, depth, h, items_json, now, now))
        existing_names.add(name)

    conn.commit()
    conn.close()

    return get_user_drawers(user_id)

# ==========================================
# User Custom Space Presets CRUD
# ==========================================
def save_user_custom_preset(user_id: str, preset: Dict[str, Any]) -> Dict[str, Any]:
    preset_id = preset.get("id") or f"custom-{uuid.uuid4().hex[:8]}"
    name = (preset.get("name") or "내 맞춤 공간").strip()
    zone = preset.get("zone") or "main_shelf"
    cat_label = preset.get("categoryLabel") or "내 맞춤 공간"
    dims = preset.get("dimensions") or {}
    width = float(dims.get("width") or preset.get("width") or 80.0)
    depth = float(dims.get("depth") or preset.get("depth") or 45.0)
    height = float(dims.get("height") or preset.get("height") or 22.0)
    description = preset.get("description") or ""
    icon = preset.get("icon") or "🌟"
    now = datetime.now().isoformat()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM user_custom_presets WHERE id = ? AND user_id = ?", (preset_id, user_id))
    exists = cursor.fetchone()

    if exists:
        cursor.execute("""
            UPDATE user_custom_presets
            SET name = ?, zone = ?, category_label = ?, width = ?, depth = ?, height = ?, description = ?, icon = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        """, (name, zone, cat_label, width, depth, height, description, icon, now, preset_id, user_id))
    else:
        cursor.execute("""
            INSERT INTO user_custom_presets (id, user_id, name, zone, category_label, width, depth, height, description, icon, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (preset_id, user_id, name, zone, cat_label, width, depth, height, description, icon, now, now))

    conn.commit()
    conn.close()

    return {
        "id": preset_id,
        "name": name,
        "category": "custom",
        "categoryLabel": cat_label,
        "zone": zone,
        "dimensions": { "width": width, "depth": depth, "height": height },
        "description": description,
        "icon": icon,
        "createdAt": now,
        "updatedAt": now
    }

def get_user_custom_presets(user_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, zone, category_label, width, depth, height, description, icon, created_at, updated_at
        FROM user_custom_presets
        WHERE user_id = ?
        ORDER BY updated_at DESC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "name": r["name"],
            "category": "custom",
            "categoryLabel": r["category_label"],
            "zone": r["zone"],
            "dimensions": {
                "width": r["width"],
                "depth": r["depth"],
                "height": r["height"]
            },
            "description": r["description"],
            "icon": r["icon"],
            "createdAt": r["created_at"],
            "updatedAt": r["updated_at"]
        })
    return results

def delete_user_custom_preset(user_id: str, preset_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_custom_presets WHERE id = ? AND user_id = ?", (preset_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

# ==========================================
# Admin Management Functions
# ==========================================
def admin_get_all_users(search: Optional[str] = None, provider: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT u.id, u.email, u.username, u.provider, u.avatar_url, u.role, u.created_at,
               COUNT(d.id) as saved_drawers_count
        FROM users u
        LEFT JOIN saved_drawers d ON u.id = d.user_id
    """
    conditions = []
    params = []

    if search:
        s = f"%{search.strip().lower()}%"
        conditions.append("(LOWER(u.email) LIKE ? OR LOWER(u.username) LIKE ?)")
        params.extend([s, s])

    if provider and provider != 'all':
        conditions.append("u.provider = ?")
        params.append(provider.strip().lower())

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " GROUP BY u.id ORDER BY u.created_at DESC"

    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r['id'],
            "email": r['email'],
            "username": r['username'],
            "provider": r['provider'] or 'local',
            "avatar_url": r['avatar_url'] or '',
            "role": r['role'] or 'user',
            "saved_drawers_count": r['saved_drawers_count'],
            "created_at": r['created_at']
        }
        for r in rows
    ]

def admin_get_stats() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
    admin_users = cursor.fetchone()[0]

    cursor.execute("SELECT provider, COUNT(*) FROM users GROUP BY provider")
    provider_counts = {r[0] or 'local': r[1] for r in cursor.fetchall()}

    cursor.execute("SELECT COUNT(*) FROM saved_drawers")
    total_saved_drawers = cursor.fetchone()[0]

    conn.close()

    return {
        "total_users": total_users,
        "admin_users": admin_users,
        "total_saved_drawers": total_saved_drawers,
        "providers": {
            "local": provider_counts.get("local", 0),
            "google": provider_counts.get("google", 0),
            "kakao": provider_counts.get("kakao", 0)
        }
    }

def admin_update_user_role(user_id: str, new_role: str) -> bool:
    if new_role not in ('admin', 'user'):
        raise ValueError("역할은 'admin' 또는 'user'만 가능합니다.")

    conn = get_connection()
    cursor = conn.cursor()

    # Prevent demoting the super admin
    cursor.execute("SELECT email FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    if row['email'] == 'joonho1366@gmail.com' and new_role != 'admin':
        conn.close()
        raise ValueError("최고 관리자(joonho1366@gmail.com)의 권한은 해제할 수 없습니다.")

    cursor.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def admin_delete_user(user_id: str, current_admin_id: str) -> bool:
    if user_id == current_admin_id:
        raise ValueError("본인 계정은 삭제할 수 없습니다.")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT email FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    if row['email'] == 'joonho1366@gmail.com':
        conn.close()
        raise ValueError("최고 관리자 계정은 삭제할 수 없습니다.")

    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def admin_get_user_drawers(user_id: str) -> List[Dict[str, Any]]:
    return get_user_saved_drawers(user_id)

def create_shared_link(
    title: str,
    drawer: Dict[str, Any],
    items: List[Dict[str, Any]],
    active_store: Optional[Dict[str, Any]] = None,
    active_purpose: Optional[Dict[str, Any]] = None
) -> str:
    share_id = secrets.token_urlsafe(6)  # e.g. 'aB7x9Q' (short and clean for Kakao links)
    now = datetime.now().isoformat()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO shared_links (id, title, drawer_json, items_json, active_store_json, active_purpose_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        share_id,
        title,
        json.dumps(drawer, ensure_ascii=False),
        json.dumps(items, ensure_ascii=False),
        json.dumps(active_store or {}, ensure_ascii=False),
        json.dumps(active_purpose or {}, ensure_ascii=False),
        now
    ))
    conn.commit()
    conn.close()
    return share_id

def get_shared_link(share_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM shared_links WHERE id = ?", (share_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    # Increment view count
    cursor.execute("UPDATE shared_links SET view_count = view_count + 1 WHERE id = ?", (share_id,))
    conn.commit()

    data = {
        "id": row["id"],
        "title": row["title"],
        "drawer": json.loads(row["drawer_json"]),
        "items": json.loads(row["items_json"]),
        "active_store": json.loads(row["active_store_json"]) if row["active_store_json"] else None,
        "active_purpose": json.loads(row["active_purpose_json"]) if row["active_purpose_json"] else None,
        "view_count": row["view_count"] + 1,
        "created_at": row["created_at"]
    }
    conn.close()
    return data

# Initialize DB on load
init_db()
