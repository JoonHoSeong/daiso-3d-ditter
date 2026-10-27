from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel, Field
from .auth_routes import get_current_user
from ..db.database import (
    admin_get_all_users,
    admin_get_stats,
    admin_update_user_role,
    admin_delete_user,
    admin_get_user_drawers
)

router = APIRouter(prefix="/admin", tags=["Admin Management"])

def require_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") != "admin" and current_user.get("email") != "joonho1366@gmail.com":
        raise HTTPException(
            status_code=403,
            detail="관리자(Admin) 권한이 필요한 기능입니다. 관리자 계정으로 로그인해 주세요."
        )
    return current_user

class RoleUpdateRequest(BaseModel):
    role: str = Field(..., description="'admin' | 'user'")

@router.get("/stats")
def get_system_stats(admin: Dict[str, Any] = Depends(require_admin_user)):
    """Returns overview statistics of users and saved drawers."""
    try:
        return admin_get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통계 조회 중 오류: {str(e)}")

@router.get("/users")
def get_users_list(
    search: Optional[str] = Query(None, description="검색어 (이메일 또는 닉네임)"),
    provider: Optional[str] = Query(None, description="제공자 필터 (local, google, kakao)"),
    admin: Dict[str, Any] = Depends(require_admin_user)
):
    """Returns list of registered users with drawer count."""
    try:
        users = admin_get_all_users(search=search, provider=provider)
        return {"users": users, "total": len(users)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"사용자 목록 조회 중 오류: {str(e)}")

@router.patch("/users/{user_id}/role")
def update_user_role_endpoint(
    user_id: str,
    req: RoleUpdateRequest,
    admin: Dict[str, Any] = Depends(require_admin_user)
):
    """Changes user's role between admin and user."""
    try:
        success = admin_update_user_role(user_id, req.role)
        if not success:
            raise HTTPException(status_code=404, detail="해당 사용자를 찾을 수 없습니다.")
        return {"success": True, "message": f"사용자 역할이 '{req.role}'(으)로 변경되었습니다."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"역할 변경 처리 중 오류: {str(e)}")

@router.delete("/users/{user_id}")
def delete_user_endpoint(
    user_id: str,
    admin: Dict[str, Any] = Depends(require_admin_user)
):
    """Deletes a user account and their saved configurations."""
    try:
        success = admin_delete_user(user_id, current_admin_id=admin["id"])
        if not success:
            raise HTTPException(status_code=404, detail="해당 사용자를 찾을 수 없습니다.")
        return {"success": True, "message": "사용자 계정이 성공적으로 삭제되었습니다."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"사용자 삭제 처리 중 오류: {str(e)}")

@router.get("/users/{user_id}/drawers")
def get_user_drawers_endpoint(
    user_id: str,
    admin: Dict[str, Any] = Depends(require_admin_user)
):
    """Returns saved drawers created by the specified user."""
    try:
        drawers = admin_get_user_drawers(user_id)
        return {"drawers": drawers, "count": len(drawers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서랍 목록 조회 중 오류: {str(e)}")
