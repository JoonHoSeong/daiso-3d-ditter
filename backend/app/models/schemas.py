from typing import List, Optional, Literal
from pydantic import BaseModel, Field, computed_field

class DaisoProduct(BaseModel):
    id: str
    item_code: str = Field(..., description="다이소 품번 (예: 1032841)")
    name: str
    category: str
    category_label: str = Field(..., description="카테고리 라벨")
    width: float = Field(..., description="가로 (cm)")
    depth: float = Field(..., description="세로 (cm)")
    height: float = Field(..., description="높이 (cm)")
    dim_source: str = Field("official_spec", description="규격 출처 (official_spec | title_regex | inferred)")
    price: int = Field(..., description="가격 (KRW)")
    color: str = Field('#BAE6FD', description="3D 시각화 색상 (HEX)")
    image_url: Optional[str] = Field(None, description="다이소몰 공식 썸네일 이미지 URL")
    is_sold_out: bool = Field(False, description="품절 여부")
    description: str = ""
    mall_url: str = "https://www.daisomall.co.kr"

    @computed_field
    @property
    def itemCode(self) -> str:
        return self.item_code

    @computed_field
    @property
    def categoryLabel(self) -> str:
        return self.category_label

    @computed_field
    @property
    def imageUrl(self) -> Optional[str]:
        return self.image_url

    @computed_field
    @property
    def isSoldOut(self) -> bool:
        return self.is_sold_out

    @computed_field
    @property
    def mallUrl(self) -> str:
        return self.mall_url

    @computed_field
    @property
    def dimSource(self) -> str:
        return self.dim_source

class DrawerDimension(BaseModel):
    width: float = Field(..., ge=5.0, le=200.0, description="서랍 가로 폭 (cm)")
    depth: float = Field(..., ge=5.0, le=200.0, description="서랍 세로 깊이 (cm)")
    height: float = Field(..., ge=3.0, le=100.0, description="서랍 높이 (cm)")

class FittedItem(BaseModel):
    instance_id: str
    product_id: str
    product: DaisoProduct
    x: float = Field(..., description="서랍 좌측 기준 X 오프셋 (cm)")
    y: float = Field(0.0, description="서랍 바닥 기준 높이 Y 오프셋 (cm)")
    z: float = Field(..., description="서랍 전면 기준 Z 오프셋 (cm)")
    rotation: Literal[0, 90] = 0
    posture: Optional[str] = Field("flat", description="3D 보관 방향 (flat | stand_front | stand_side)")

class SpaceMetrics(BaseModel):
    drawer_floor_area: float
    occupied_floor_area: float
    floor_utilization: int
    volume_utilization: int
    total_price: int
    item_count: int

class FitRequest(BaseModel):
    drawer: DrawerDimension
    selected_product_ids: Optional[List[str]] = None
    strategy: Literal['balanced', 'tightest', 'maximize_items'] = 'balanced'

class FitResponse(BaseModel):
    drawer: DrawerDimension
    items: List[FittedItem]
    metrics: SpaceMetrics
