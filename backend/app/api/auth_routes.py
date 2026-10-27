from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr, Field
from ..db.database import (
    create_user,
    authenticate_user,
    create_user_token,
    get_user_by_token,
    delete_user_token
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    email: str = Field(..., description="사용자 이메일")
    username: str = Field(..., min_length=2, max_length=30, description="사용자 닉네임")
    password: str = Field(..., min_length=4, description="비밀번호 (4자 이상)")

class LoginRequest(BaseModel):
    email: str = Field(..., description="가입 이메일")
    password: str = Field(..., description="비밀번호")

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

@router.get("/me")
def me(user: Dict[str, Any] = Depends(get_current_user)):
    return {"user": user}

@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
        delete_user_token(token)
    return {"message": "로그아웃되었습니다."}
