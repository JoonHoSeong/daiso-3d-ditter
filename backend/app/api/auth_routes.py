import os
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr, Field
import httpx
from ..db.database import (
    create_user,
    authenticate_user,
    create_user_token,
    get_user_by_token,
    delete_user_token,
    find_or_create_social_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    email: str = Field(..., description="사용자 이메일")
    username: str = Field(..., min_length=2, max_length=30, description="사용자 닉네임")
    password: str = Field(..., min_length=4, description="비밀번호 (4자 이상)")

class LoginRequest(BaseModel):
    email: str = Field(..., description="가입 이메일")
    password: str = Field(..., description="비밀번호")

class SocialLoginRequest(BaseModel):
    provider: str = Field(..., description="'google' | 'kakao'")
    email: str = Field(..., description="사용자 이메일")
    username: str = Field(..., min_length=1, description="사용자 닉네임")
    provider_id: Optional[str] = Field(None, description="소셜 고유 ID")
    avatar_url: Optional[str] = Field("", description="프로필 사진 URL")
    credential: Optional[str] = Field(None, description="Google ID Token 또는 Kakao Access Token")

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 제공되지 않았습니다. 로그인이 필요합니다.")
    token = authorization.split("Bearer ")[1].strip()
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="유효하지 않거나 만료된 세션입니다. 다시 로그인해 주세요.")
    return user

def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split("Bearer ")[1].strip()
    return get_user_by_token(token)

@router.post("/register")
def register(req: RegisterRequest):
    try:
        user = create_user(req.email, req.username, req.password)
        token = create_user_token(user["id"])
        return {
            "token": token,
            "user": user,
            "message": "회원가입이 성공적으로 완료되었습니다."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"회원가입 처리 중 오류 발생: {str(e)}")

@router.post("/login")
def login(req: LoginRequest):
    user = authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    token = create_user_token(user["id"])
    return {
        "token": token,
        "user": user,
        "message": f"{user['username']}님, 환영합니다!"
    }

async def verify_google_token(credential: str) -> Optional[Dict[str, Any]]:
    """Verifies Google ID Token via Google tokeninfo endpoint."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}")
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "provider_id": data.get("sub"),
                    "email": data.get("email"),
                    "username": data.get("name") or data.get("email", "").split("@")[0],
                    "avatar_url": data.get("picture", "")
                }
    except Exception:
        pass
    return None

async def verify_kakao_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies Kakao Access Token via Kakao userinfo endpoint."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://kapi.kakao.com/v2/user/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            if resp.status_code == 200:
                data = resp.json()
                kakao_account = data.get("kakao_account", {})
                properties = data.get("properties", {})
                email = kakao_account.get("email") or f"kakao_{data.get('id')}@kakao.user"
                username = properties.get("nickname") or f"카카오유저_{str(data.get('id'))[-4:]}"
                avatar_url = properties.get("profile_image") or ""
                return {
                    "provider_id": str(data.get("id")),
                    "email": email,
                    "username": username,
                    "avatar_url": avatar_url
                }
    except Exception:
        pass
    return None

@router.post("/social-login")
async def social_login(req: SocialLoginRequest):
    provider = req.provider.strip().lower()
    if provider not in ("google", "kakao"):
        raise HTTPException(status_code=400, detail="지원하지 않는 소셜 로그인 제공자입니다. (google 또는 kakao만 지원)")

    email = req.email.strip().lower()
    username = req.username.strip()
    provider_id = req.provider_id or ""
    avatar_url = req.avatar_url or ""

    # Optional server-side credential token verification
    if req.credential:
        if provider == "google":
            verified = await verify_google_token(req.credential)
            if verified:
                email = verified["email"] or email
                username = verified["username"] or username
                provider_id = verified["provider_id"] or provider_id
                avatar_url = verified["avatar_url"] or avatar_url
        elif provider == "kakao":
            verified = await verify_kakao_token(req.credential)
            if verified:
                email = verified["email"] or email
                username = verified["username"] or username
                provider_id = verified["provider_id"] or provider_id
                avatar_url = verified["avatar_url"] or avatar_url

    if not email:
        raise HTTPException(status_code=400, detail="소셜 계정의 이메일 정보가 유효하지 않습니다.")

    try:
        user = find_or_create_social_user(
            provider=provider,
            provider_id=provider_id,
            email=email,
            username=username,
            avatar_url=avatar_url
        )
        token = create_user_token(user["id"])
        provider_label = "Google" if provider == "google" else "카카오"
        return {
            "token": token,
            "user": user,
            "message": f"🎉 {provider_label} 계정으로 성공적으로 연동 로그인되었습니다!"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"소셜 로그인 처리 중 오류 발생: {str(e)}")

@router.get("/social/providers")
def get_social_providers():
    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    kakao_client_id = os.getenv("KAKAO_CLIENT_ID", "") or os.getenv("KAKAO_REST_API_KEY", "")
    return {
        "google": {
            "enabled": True,
            "configured": bool(google_client_id),
            "client_id": google_client_id
        },
        "kakao": {
            "enabled": True,
            "configured": bool(kakao_client_id),
            "client_id": kakao_client_id
        }
    }

@router.get("/me")
def me(user: Dict[str, Any] = Depends(get_current_user)):
    return {"user": user}

@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
        delete_user_token(token)
    return {"message": "로그아웃되었습니다."}
