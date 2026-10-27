import asyncio
import datetime
import httpx
import json
import logging
import re
import time
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List
from .parser import DimensionParser

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("PreciseDimUpdater")

def parse_detail_text(txt: str) -> Optional[Tuple[float, float, float]]:
    return DimensionParser.parse_detail_text(txt)

async def fetch_desc_with_retry(client: httpx.AsyncClient, pd_no: str, retries: int = 2) -> Optional[str]:
    url = "https://www.daisomall.co.kr/api/pd/pdr/pdDtl/selPdDtlDesc"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json"
    }
    for attempt in range(retries + 1):
        try:
            resp = await client.post(url, json={"pdNo": pd_no}, headers=headers, timeout=8.0)
            if resp.status_code == 200:
                data = resp.json()
                desc_obj = data.get("data", {}).get("pdDtlDesc", {})
                vsip = desc_obj.get("vsipPdDtl", "") or ""
                dc = desc_obj.get("pdDtlDc", "") or ""
                return f"{vsip}\n{dc}".strip()
        except Exception:
            if attempt < retries:
                await asyncio.sleep(0.2)
    return None

async def update_all_organizer_dimensions():
    base_dir = Path(__file__).resolve().parent.parent.parent
    backend_data_path = base_dir / "data" / "daiso_organizers.json"
    frontend_data_path = base_dir.parent / "frontend" / "src" / "data" / "daiso_organizers.json"

    logger.info(f"Loading {backend_data_path}...")
    with open(backend_data_path, "r", encoding="utf-8") as f:
        products = json.load(f)

    logger.info(f"Total products loaded: {len(products):,}")

    organizer_keywords = [
        "정리함", "수납", "트레이", "바구니", "박스", "선반", "오거나이저", "케이스",
        "매트", "시트", "서랍", "보관함", "정리대", "디바이더", "칸막이", "정리", "김치통", "용기"
    ]

    target_items = []
    for item in products:
        cat = item.get("category")
        name = item.get("name", "")
        code = item.get("item_code")
        w = item.get("width")
        d = item.get("depth")
        h = item.get("height")

        if not code or code.startswith("B") or code.startswith("b"):
            continue

        is_storage = (cat == "storage")
        has_keyword = any(k in name for k in organizer_keywords)
        is_fallback = (w == 10.0 and d == 10.0 and h == 10.0)

        if is_storage or has_keyword or (is_fallback and cat in ["storage", "kitchen_food", "living_fashion", "bath_cleaning", "beauty", "stationery"]):
            target_items.append(item)

    logger.info(f"Identified {len(target_items):,} target items for precise official dimension retrieval.")

    chunk_size = 35
    updated_count = 0
    t0 = time.time()

    async with httpx.AsyncClient(limits=httpx.Limits(max_connections=35, max_keepalive_connections=20)) as client:
        for idx in range(0, len(target_items), chunk_size):
            chunk = target_items[idx : idx + chunk_size]
            tasks = [fetch_desc_with_retry(client, it["item_code"]) for it in chunk]
            results = await asyncio.gather(*tasks)

            for item, raw_text in zip(chunk, results):
                if not raw_text:
                    continue

                dims = parse_detail_text(raw_text)
                if dims:
                    w, d, h = dims
                    old_dims = (item["width"], item["depth"], item["height"])
                    if old_dims != (w, d, h):
                        item["width"] = w
                        item["depth"] = d
                        item["height"] = h
                        price = item.get("price", 1000)
                        sold_str = " [일시품절]" if item.get("is_sold_out") else ""
                        item["description"] = f"규격: {w} × {d} × {h} cm (₩{price:,}){sold_str}"
                        updated_count += 1

            if (idx + chunk_size) % 350 == 0 or (idx + chunk_size) >= len(target_items):
                elapsed = time.time() - t0
                pct = min(100.0, (idx + chunk_size) / len(target_items) * 100)
                logger.info(f"Progress: {min(idx + chunk_size, len(target_items)):,}/{len(target_items):,} ({pct:.1f}%) in {elapsed:.1f}s | Updated: {updated_count:,}")

            await asyncio.sleep(0.03)

    logger.info(f"Completed! Total items updated: {updated_count:,}")

    with open(backend_data_path, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    logger.info(f"Saved updated catalog to {backend_data_path}")

    if frontend_data_path.parent.exists():
        with open(frontend_data_path, "w", encoding="utf-8") as f:
            json.dump(products, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved updated catalog to {frontend_data_path}")

if __name__ == "__main__":
    asyncio.run(update_all_organizer_dimensions())
