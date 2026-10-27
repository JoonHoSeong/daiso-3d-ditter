from typing import List, Optional, Literal, Any
from pydantic import BaseModel, Field, computed_field, model_validator

class DaisoProduct(BaseModel):
    id: str
    item_code: str = Field(..., description="다이소 품번 (예: 1032841)")
    name: str
    category: str
    category_label: str = Field(..., description="카테고리 라벨")
    large_category: Optional[str] = Field(None, description="대분류 (예: 주방용품, 식품, 수납/정리)")
    middle_category: Optional[str] = Field(None, description="중분류 (예: 밀폐/보관용기, 양념/조미료)")
    small_category: Optional[str] = Field(None, description="소분류 (예: 소스병/양념통, 오일/밤)")
    category_hierarchy: Optional[str] = Field(None, description="계층 경로 (예: 주방용품 > 밀폐/보관/저장용기 > 소스병/양념통)")
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

    @model_validator(mode='before')
    @classmethod
    def map_camel_case(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for camel, snake in [
                ('largeCategory', 'large_category'),
                ('middleCategory', 'middle_category'),
                ('smallCategory', 'small_category'),
                ('categoryHierarchy', 'category_hierarchy'),
                ('itemCode', 'item_code'),
                ('categoryLabel', 'category_label'),
                ('imageUrl', 'image_url'),
                ('isSoldOut', 'is_sold_out'),
                ('dimSource', 'dim_source'),
                ('mallUrl', 'mall_url')
            ]:
                if camel in data and snake not in data:
                    data[snake] = data[camel]
        return data

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
    def largeCategory(self) -> Optional[str]:
        return self.large_category

    @computed_field
    @property
    def middleCategory(self) -> Optional[str]:
        return self.middle_category

    @computed_field
    @property
    def smallCategory(self) -> Optional[str]:
        return self.small_category

    @computed_field
    @property
    def categoryHierarchy(self) -> Optional[str]:
        return self.category_hierarchy

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
