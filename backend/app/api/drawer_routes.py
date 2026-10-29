from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from .auth_routes import get_current_user
from ..db.database import (
    save_user_drawer,
    get_user_drawers,
    delete_user_drawer,
    update_user_drawer,
    migrate_guest_drawers,
    save_user_custom_preset,
    get_user_custom_presets,
    delete_user_custom_preset,
    create_shared_link,
    get_shared_link
)

router = APIRouter(prefix="/drawers", tags=["Saved Drawers"])

class SaveDrawerRequest(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=100, description="서랍 이름 (예: 내 책상 1번 서랍)")
    width: float = Field(..., ge=5.0, le=200.0, description="가로 (cm)")
    depth: float = Field(..., ge=5.0, le=200.0, description="세로 (cm)")
    height: float = Field(..., ge=3.0, le=100.0, description="높이 (cm)")
    category: Optional[str] = "개인 서랍"
    items: Optional[List[Dict[str, Any]]] = None

class UpdateDrawerRequest(BaseModel):
    name: Optional[str] = None
    width: Optional[float] = None
    depth: Optional[float] = None
    height: Optional[float] = None
    items: Optional[List[Dict[str, Any]]] = None
    category: Optional[str] = None

class MigrateGuestDrawersRequest(BaseModel):
    guest_drawers: List[Dict[str, Any]]

class CustomPresetRequest(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=100)
    zone: str = "main_shelf"
    categoryLabel: Optional[str] = "내 맞춤 공간"
    dimensions: Optional[Dict[str, float]] = None
    width: Optional[float] = None
    depth: Optional[float] = None
    height: Optional[float] = None
    description: Optional[str] = ""
    icon: Optional[str] = "🌟"

@router.get("")
def list_drawers(user: Dict[str, Any] = Depends(get_current_user)):
    """Returns all custom saved drawers for the logged-in user."""
    drawers = get_user_drawers(user["id"])
    return {"drawers": drawers}

@router.post("")
def save_drawer(req: SaveDrawerRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Saves or updates a custom drawer dimension (and optionally placed items layout)."""
    saved = save_user_drawer(
        user_id=user["id"],
        name=req.name,
        width=req.width,
        depth=req.depth,
        height=req.height,
        items=req.items,
        category=req.category or "개인 서랍",
        drawer_id=req.id
    )
    return {"message": "서랍 크기가 성공적으로 저장되었습니다.", "drawer": saved}

@router.put("/{drawer_id}")
def update_drawer(drawer_id: str, req: UpdateDrawerRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Updates an existing drawer's name, dimensions, or placed items."""
    updated = update_user_drawer(
        user_id=user["id"],
        drawer_id=drawer_id,
        name=req.name,
        width=req.width,
        depth=req.depth,
        height=req.height,
        items=req.items,
        category=req.category
    )
    if not updated:
        raise HTTPException(status_code=404, detail="해당 서랍 정보를 찾을 수 없습니다.")
    return {"message": "서랍이 성공적으로 수정되었습니다.", "drawer": updated}

@router.delete("/{drawer_id}")
def delete_drawer(drawer_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Deletes a custom saved drawer."""
    deleted = delete_user_drawer(user["id"], drawer_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="해당 서랍 정보를 찾을 수 없습니다.")
    return {"message": "서랍이 삭제되었습니다."}

@router.post("/migrate")
def migrate_drawers(req: MigrateGuestDrawersRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Migrates guest/local drawers into the user's account upon login."""
    updated_drawers = migrate_guest_drawers(user["id"], req.guest_drawers)
    return {
        "message": f"게스트 서랍 {len(req.guest_drawers)}개가 성공적으로 동기화되었습니다.",
        "drawers": updated_drawers
    }

# Custom Space Presets
@router.get("/custom-presets")
def list_custom_presets(user: Dict[str, Any] = Depends(get_current_user)):
    """Returns all cloud-synced custom space presets for the user."""
    presets = get_user_custom_presets(user["id"])
    return {"presets": presets}

@router.post("/custom-presets")
def save_custom_preset(req: CustomPresetRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Saves or updates a custom space preset in the cloud."""
    saved = save_user_custom_preset(user["id"], req.dict())
    return {"message": "맞춤 공간 프리셋이 클라우드에 저장되었습니다.", "preset": saved}

@router.delete("/custom-presets/{preset_id}")
def delete_custom_preset(preset_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Deletes a custom space preset."""
    deleted = delete_user_custom_preset(user["id"], preset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="해당 프리셋을 찾을 수 없습니다.")
    return {"message": "맞춤 공간 프리셋이 삭제되었습니다."}

class CreateShareRequest(BaseModel):
    title: Optional[str] = "내 다이소 3D 서랍 맞춤 피팅"
    drawer: Dict[str, Any]
    items: List[Dict[str, Any]]
    active_store: Optional[Dict[str, Any]] = None
    active_purpose: Optional[Dict[str, Any]] = None

@router.post("/share")
def create_share(req: CreateShareRequest):
    """Creates a public 3D drawer share link (for KakaoTalk / Social Share)."""
    share_id = create_shared_link(
        title=req.title or "내 다이소 3D 서랍 맞춤 피팅",
        drawer=req.drawer,
        items=req.items,
        active_store=req.active_store,
        active_purpose=req.active_purpose
    )
    return {"share_id": share_id, "url": f"/share/{share_id}"}

@router.get("/share/{share_id}")
def get_share(share_id: str):
    """Retrieves shared 3D drawer data by short share ID."""
    data = get_shared_link(share_id)
    if not data:
        raise HTTPException(status_code=404, detail="공유된 서랍 정보를 찾을 수 없거나 만료되었습니다.")
    return data
