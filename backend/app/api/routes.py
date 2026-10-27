import json
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from ..models.schemas import DaisoProduct, FitRequest, FitResponse, DrawerDimension
from ..algorithms.packer import DrawerPacker
from ..scraper.collect_all import crawl_daiso_catalog, get_sync_status

router = APIRouter(prefix="/api", tags=["Drawer Fitter"])

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "daiso_organizers.json"

def load_products_from_file() -> List[DaisoProduct]:
    if not DATA_PATH.exists():
        return []
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return [DaisoProduct(**item) for item in data]

@router.get("/health")
def health_check():
    return {"status": "ok", "service": "daiso-3d-fitter-backend"}

@router.get("/products", response_model=List[DaisoProduct])
def get_products():
    """Returns the list of organized Daiso storage items with W x D x H specs and item codes."""
    products = load_products_from_file()
    return products

@router.get("/presets")
def get_presets():
    """Returns standard drawer and space dimension presets."""
    return [
        {
            "name": "표준 데스크 서랍",
            "desc": "이케아 헬메르/알렉스 등 사무용 서랍",
            "dimensions": {"width": 32.0, "depth": 40.0, "height": 7.0}
        },
        {
            "name": "주방 싱크대 서랍",
            "desc": "수저 및 조리도구용 넓고 깊은 서랍",
            "dimensions": {"width": 45.0, "depth": 45.0, "height": 8.0}
        },
        {
            "name": "화장대 / 콘솔 서랍",
            "desc": "화장품 및 미용 소품용 얕은 서랍",
            "dimensions": {"width": 36.0, "depth": 28.0, "height": 5.5}
        },
        {
            "name": "옷장 서랍장 (와이드)",
            "desc": "양말, 속옷, 의류 수납용 깊은 서랍",
            "dimensions": {"width": 60.0, "depth": 42.0, "height": 12.0}
        },
        {
            "name": "캠핑 왜건 / 트렁크 공간",
            "desc": "캠핑 폴딩박스 및 카고박스 수납 공간",
            "dimensions": {"width": 85.0, "depth": 55.0, "height": 35.0}
        },
        {
            "name": "팬트리 선반 칸",
            "desc": "주방/베란다 팬트리 바구니 정리 선반",
            "dimensions": {"width": 70.0, "depth": 38.0, "height": 25.0}
        }
    ]

@router.post("/fit", response_model=FitResponse)
def compute_fitting(req: FitRequest):
    """
    Computes optimal 2D/3D bin packing for given drawer dimensions.
    Returns placed items with exact coordinates and space utilization metrics.
    """
    products = load_products_from_file()
    if req.selected_product_ids:
        products = [p for p in products if p.id in req.selected_product_ids]

    if not products:
        raise HTTPException(status_code=400, detail="No suitable products found for packing.")

    items, metrics = DrawerPacker.pack(req.drawer, products, strategy=req.strategy)

    return FitResponse(
        drawer=req.drawer,
        items=items,
        metrics=metrics
    )

@router.post("/scraper/sync")
def trigger_catalog_sync(background_tasks: BackgroundTasks):
    """
    Triggers an asynchronous scraping sync for Daiso products.
    """
    status = get_sync_status()
    if status.get("is_running"):
        return {"message": "Sync is already in progress.", "status": status}

    background_tasks.add_task(crawl_daiso_catalog)
    return {"message": "Sync started in background.", "status": "started"}

@router.get("/scraper/status")
def get_scraper_status():
    """
    Returns the current sync status, last update timestamp, and total products count.
    """
    return get_sync_status()
