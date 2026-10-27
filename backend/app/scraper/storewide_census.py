import asyncio
import datetime
import httpx
import json
import logging
import time
from pathlib import Path
from typing import Optional, Tuple
from .parser import DimensionParser

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("StorewideCensus")
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

def parse_detail_text(txt: str, name: str = "") -> Optional[Tuple[float, float, float]]:
    return DimensionParser.parse_detail_text(txt, name)

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
                desc_obj = (data.get("data") or {}).get("pdDtlDesc") or {}
                vsip = desc_obj.get("vsipPdDtl") or ""
                dc = desc_obj.get("pdDtlDc") or ""
                return f"{vsip}\n{dc}".strip()
        except Exception:
            if attempt < retries:
                await asyncio.sleep(0.15)
    return None

def format_product_desc(w: float, d: float, h: float, price: int, is_sold_out: bool, dim_source: str) -> str:
    prefix = "규격(추정)" if dim_source == "inferred" else "규격"
    sold_str = " [일시품절]" if is_sold_out else ""
    return f"{prefix}: {w} × {d} × {h} cm (₩{price:,}){sold_str}"

async def run_storewide_census():
    base_dir = Path(__file__).resolve().parent.parent.parent
    backend_data_path = base_dir / "data" / "daiso_organizers.json"
    meta_path = base_dir / "data" / "sync_meta.json"

    logger.info("=== Starting Store-Wide Exhaustive Spec Census across ALL Daiso Items ===")
    with open(backend_data_path, "r", encoding="utf-8") as f:
        raw_products = json.load(f)

    # Filter out any legacy non-daiso mock entries
    products = [p for p in raw_products if str(p.get("id", "")).startswith("daiso-")]
    total_items = len(products)
    logger.info(f"Loaded {total_items:,} authentic Daiso items for full audit.")

    chunk_size = 200
    counts = {"official_spec": 0, "title_regex": 0, "inferred": 0}
    t0 = time.time()

    limits = httpx.Limits(max_connections=200, max_keepalive_connections=120)
    async with httpx.AsyncClient(limits=limits) as client:
        for idx in range(0, total_items, chunk_size):
            chunk = products[idx : idx + chunk_size]
            tasks = [fetch_desc_with_retry(client, it.get("item_code", "")) for it in chunk]
            results = await asyncio.gather(*tasks)

            for item, raw_text in zip(chunk, results):
                name = item.get("name", "")
                cat = item.get("category", "storage")
                price = item.get("price", 1000)
                is_sold_out = bool(item.get("is_sold_out", False))

                # 1. Try official detail spec first (selPdDtlDesc)
                detail_dims = parse_detail_text(raw_text, name) if raw_text else None
                # 2. Try explicit title regex second
                title_dims = DimensionParser.parse_explicit_dims(name)

                if detail_dims:
                    w, d, h = DimensionParser.normalize_packaged_dims(name, cat, *detail_dims)
                    dim_source = "official_spec"
                elif title_dims:
                    w, d, h = DimensionParser.normalize_packaged_dims(name, cat, *title_dims)
                    dim_source = "title_regex"
                else:
                    inf_dims = DimensionParser.infer_stored_item_dims(name, cat)
                    w, d, h = DimensionParser.normalize_packaged_dims(name, cat, *inf_dims)
                    dim_source = "inferred"

                counts[dim_source] += 1
                item["width"] = w
                item["depth"] = d
                item["height"] = h
                item["dim_source"] = dim_source
                item["description"] = format_product_desc(w, d, h, price, is_sold_out, dim_source)

            items_done = min(idx + chunk_size, total_items)
            if items_done % 2000 == 0 or items_done == total_items:
                elapsed = time.time() - t0
                pct = items_done / total_items * 100
                rate = items_done / elapsed if elapsed > 0 else 0
                eta_sec = (total_items - items_done) / rate if rate > 0 else 0
                logger.info(
                    f"Census Progress: {items_done:,}/{total_items:,} ({pct:.1f}%) in {elapsed:.1f}s (~{rate:.0f} items/s, ETA: {eta_sec:.0f}s) | "
                    f"official={counts['official_spec']:,}, title={counts['title_regex']:,}, inferred={counts['inferred']:,}"
                )
                with open(backend_data_path, "w", encoding="utf-8") as f:
                    json.dump(products, f, ensure_ascii=False, indent=2)

    elapsed_total = time.time() - t0
    logger.info(
        f"=== Store-Wide Census Finished in {elapsed_total:.1f}s! "
        f"official_spec={counts['official_spec']:,}, title_regex={counts['title_regex']:,}, inferred={counts['inferred']:,} ==="
    )

    with open(backend_data_path, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    frontend_products_path = base_dir.parent / "frontend" / "src" / "data" / "daisoProducts.json"
    if frontend_products_path.parent.exists():
        frontend_products = []
        for it in products:
            dim_source = it.get("dim_source", "inferred")
            desc = format_product_desc(it["width"], it["depth"], it["height"], it["price"], bool(it.get("is_sold_out")), dim_source)
            frontend_products.append({
                "id": it["id"],
                "itemCode": it.get("item_code", ""),
                "name": it["name"],
                "category": it["category"],
                "categoryLabel": it.get("category_label", "수납/정리함"),
                "width": it["width"],
                "depth": it["depth"],
                "height": it["height"],
                "dimSource": dim_source,
                "price": it["price"],
                "color": it.get("color", "#38BDF8"),
                "imageUrl": it.get("image_url", ""),
                "isSoldOut": it.get("is_sold_out", False),
                "description": desc,
                "mallUrl": it.get("mall_url", f"https://www.daisomall.co.kr/pd/pdr/SCR_PDR_0001?pdNo={it.get('item_code', '')}")
            })
        with open(frontend_products_path, "w", encoding="utf-8") as f:
            json.dump(frontend_products, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved synchronized camelCase catalog to {frontend_products_path}")

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    meta = {
        "is_running": False,
        "last_sync": now_str,
        "total_products": total_items,
        "official_spec_count": counts["official_spec"],
        "title_regex_count": counts["title_regex"],
        "inferred_count": counts["inferred"],
        "last_error": None
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    asyncio.run(run_storewide_census())
