import os
import base64
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
import httpx
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding

router = APIRouter(prefix="/stores", tags=["Daiso Store & Inventory"])

PRE_AUTH_ENC_KEY = b"PRE_AUTH_ENC_KEY"
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko,en-US;q=0.9,en;q=0.8"
}

def generate_daiso_auth() -> tuple[str, str]:
    """Generates AES-128-CBC encrypted Bearer token from Daiso Mall's auth request endpoint."""
    with httpx.Client(timeout=6.0) as client:
        r = client.get("https://www.daisomall.co.kr/api/auth/request", headers=DEFAULT_HEADERS)
        if r.status_code != 200:
            raise RuntimeError(f"Daiso auth request failed with status {r.status_code}")
        jwt_text = r.text.strip()
        uid = r.headers.get("x-dm-uid", "")

    iv = os.urandom(16)
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(jwt_text.encode("utf-8")) + padder.finalize()

    cipher = Cipher(algorithms.AES(PRE_AUTH_ENC_KEY), modes.CBC(iv))
    encryptor = cipher.encryptor()
    encrypted = encryptor.update(padded_data) + encryptor.finalize()

    bearer = base64.b64encode(iv).decode() + base64.b64encode(encrypted).decode()
    return bearer, uid

class StockCheckRequest(BaseModel):
    store_code: str = Field(..., description="다이소 매장 코드 (strCd)")
    product_codes: List[str] = Field(..., min_length=1, description="조회할 다이소 상품 품번 목록 (예: ['1043325', '1028789'])")

class FindAllInStockRequest(BaseModel):
    product_codes: List[str] = Field(..., min_length=1, description="내가 구성한 다이소 상품 품번 목록")
    keyword: str = Field("강남", description="검색할 지역 또는 매장 키워드 (예: 강남, 마포, 분당, 수원)")

class FilterInStockRequest(BaseModel):
    store_code: str = Field(..., description="다이소 매장 코드 (strCd)")
    product_codes: List[str] = Field(..., min_length=1, description="확인할 다이소 상품 품번 후보 목록")

@router.get("/search")
async def search_stores(keyword: str = Query(..., min_length=1, description="매장명 또는 지역 검색어 (예: 강남, 마포, 분당)")):
    """Searches official Daiso branches across Korea."""
    try:
        bearer, uid = generate_daiso_auth()
        headers = {
            **DEFAULT_HEADERS,
            "Authorization": f"Bearer {bearer}",
            "X-DM-UID": uid,
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=7.0) as client:
            resp = await client.post(
                "https://www.daisomall.co.kr/api/ms/msg/selStr",
                headers=headers,
                json={"keyword": keyword.strip(), "pageSize": 15, "currentPage": 1}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="다이소 매장 검색 통신에 실패했습니다.")
            payload = resp.json()

        raw_stores = payload.get("data") or []
        stores = []
        for s in raw_stores:
            stores.append({
                "store_code": s.get("strCd"),
                "name": s.get("strNm"),
                "address": s.get("strAddr"),
                "phone": s.get("strTno"),
                "open_time": s.get("opngTime", "10:00"),
                "close_time": s.get("clsngTime", "22:00"),
                "parking": s.get("parkYn") == "Y",
                "pickup_available": s.get("pkupYn") == "Y",
                "latitude": s.get("strLttd"),
                "longitude": s.get("strLitd")
            })

        return {
            "keyword": keyword,
            "total": len(stores),
            "stores": stores
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"다이소 매장 조회 중 오류: {str(e)}")

@router.post("/stock")
async def check_store_inventory(req: StockCheckRequest):
    """Queries live store pickup inventory for specified products at a specific store branch."""
    store_code = req.store_code.strip()
    pd_codes = [c.strip() for c in req.product_codes if c.strip()]

    if not pd_codes:
        raise HTTPException(status_code=400, detail="조회할 상품 품번을 1개 이상 지정해야 합니다.")

    try:
        bearer, uid = generate_daiso_auth()
        headers = {
            **DEFAULT_HEADERS,
            "Authorization": f"Bearer {bearer}",
            "X-DM-UID": uid,
            "Content-Type": "application/json"
        }

        request_body = [{"pdNo": code, "strCd": store_code} for code in pd_codes]

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                "https://www.daisomall.co.kr/api/pd/pdh/selStrPkupStck",
                headers=headers,
                json=request_body
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="다이소 매장 재고 조회 서버 응답 오류")
            payload = resp.json()

        results = []
        stock_data = payload.get("data") or []
        stock_map = {item.get("pdNo"): item for item in stock_data}

        for code in pd_codes:
            item = stock_map.get(code)
            if item:
                qty = int(item.get("stck", 0) or 0)
                sale_status = str(item.get("sleStsCd", ""))
                # sale_status '1' = normal sale, '9' = out of stock/discontinued
                in_stock = qty > 0 and sale_status == "1"
                status_label = "재고 보유" if qty >= 5 else "소량 보유" if qty > 0 else "매장 품절"
                results.append({
                    "product_code": code,
                    "store_code": store_code,
                    "quantity": qty,
                    "in_stock": in_stock,
                    "status_label": status_label,
                    "sale_status_code": sale_status
                })
            else:
                results.append({
                    "product_code": code,
                    "store_code": store_code,
                    "quantity": 0,
                    "in_stock": False,
                    "status_label": "조회 불가 (미취급)",
                    "sale_status_code": "unknown"
                })

        all_in_stock = all(r["in_stock"] for r in results)
        any_in_stock = any(r["in_stock"] for r in results)

        return {
            "store_code": store_code,
            "total_items": len(results),
            "all_in_stock": all_in_stock,
            "any_in_stock": any_in_stock,
            "items": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"다이소 매장 재고 조회 중 오류: {str(e)}")

@router.post("/find-all-in-stock")
async def find_all_in_stock_stores(req: FindAllInStockRequest):
    """
    내가 3D 서랍에 구성한 상품들이 '모두 있는(100% 재고 보유)' 매장을 역추적하여 찾습니다.
    특정 지역/키워드로 검색된 매장들을 대상으로 전 품목 일괄 재고 질의를 수행합니다.
    """
    keyword = req.keyword.strip() or "강남"
    pd_codes = [c.strip() for c in req.product_codes if c.strip()]
    if not pd_codes:
        raise HTTPException(status_code=400, detail="조회할 상품 품번 목록이 비어 있습니다.")

    try:
        bearer, uid = generate_daiso_auth()
        headers = {
            **DEFAULT_HEADERS,
            "Authorization": f"Bearer {bearer}",
            "X-DM-UID": uid,
            "Content-Type": "application/json"
        }

        # 1. Search stores by keyword
        async with httpx.AsyncClient(timeout=9.0) as client:
            store_resp = await client.post(
                "https://www.daisomall.co.kr/api/ms/msg/selStr",
                headers=headers,
                json={"keyword": keyword, "pageSize": 15, "currentPage": 1}
            )
            if store_resp.status_code != 200:
                raise HTTPException(status_code=store_resp.status_code, detail="다이소 매장 검색 실패")
            store_payload = store_resp.json()
            raw_stores = store_payload.get("data") or []

            if not raw_stores:
                return {
                    "keyword": keyword,
                    "total_stores_checked": 0,
                    "all_in_stock_stores_count": 0,
                    "product_codes": pd_codes,
                    "stores": []
                }

            # 2. Batch query stock for all stores x all products
            batch_req = []
            for s in raw_stores:
                str_cd = str(s.get("strCd"))
                for code in pd_codes:
                    batch_req.append({"pdNo": code, "strCd": str_cd})

            stock_resp = await client.post(
                "https://www.daisomall.co.kr/api/pd/pdh/selStrPkupStck",
                headers=headers,
                json=batch_req
            )
            if stock_resp.status_code != 200:
                raise HTTPException(status_code=stock_resp.status_code, detail="다이소 매장 재고 조회 응답 실패")
            stock_data = stock_resp.json().get("data") or []

        # 3. Group stock results by store
        # Key: (strCd, pdNo) -> item
        stock_map = {}
        for item in stock_data:
            key = (str(item.get("strCd")), str(item.get("pdNo")))
            stock_map[key] = item

        evaluated_stores = []
        for s in raw_stores:
            str_cd = str(s.get("strCd"))
            item_results = []
            in_stock_count = 0

            for code in pd_codes:
                stk = stock_map.get((str_cd, code))
                if stk:
                    qty = int(stk.get("stck", 0) or 0)
                    sale_status = str(stk.get("sleStsCd", ""))
                    is_in = qty > 0 and sale_status == "1"
                    if is_in:
                        in_stock_count += 1
                    status_label = "재고 보유" if qty >= 5 else "소량 보유" if qty > 0 else "매장 품절"
                    item_results.append({
                        "product_code": code,
                        "store_code": str_cd,
                        "quantity": qty,
                        "in_stock": is_in,
                        "status_label": status_label,
                        "sale_status_code": sale_status
                    })
                else:
                    item_results.append({
                        "product_code": code,
                        "store_code": str_cd,
                        "quantity": 0,
                        "in_stock": False,
                        "status_label": "미취급 / 품절",
                        "sale_status_code": "unknown"
                    })

            all_in_stock = (in_stock_count == len(pd_codes))

            evaluated_stores.append({
                "store_code": str_cd,
                "name": s.get("strNm"),
                "address": s.get("strAddr"),
                "phone": s.get("strTno"),
                "open_time": s.get("opngTime", "10:00"),
                "close_time": s.get("clsngTime", "22:00"),
                "parking": s.get("parkYn") == "Y",
                "pickup_available": s.get("pkupYn") == "Y",
                "latitude": s.get("strLttd"),
                "longitude": s.get("strLitd"),
                "all_in_stock": all_in_stock,
                "available_count": in_stock_count,
                "total_items": len(pd_codes),
                "items": item_results
            })

        # Sort: 1) all_in_stock true first, 2) available_count desc
        evaluated_stores.sort(key=lambda x: (not x["all_in_stock"], -x["available_count"]))
        all_in_count = sum(1 for s in evaluated_stores if s["all_in_stock"])

        return {
            "keyword": keyword,
            "total_stores_checked": len(evaluated_stores),
            "all_in_stock_stores_count": all_in_count,
            "product_codes": pd_codes,
            "stores": evaluated_stores
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"전 품목 보유 매장 조회 중 오류: {str(e)}")

@router.post("/filter-in-stock")
async def filter_store_in_stock_products(req: FilterInStockRequest):
    """
    특정 지점(store_code)을 기준으로 상품 목록 후보군 중 현재 재고가 있는 상품만 필터링합니다.
    사용자가 원하는 지점을 선택했을 때 해당 지점 재고만으로 서랍을 자동/수동 구성할 때 사용됩니다.
    """
    store_code = req.store_code.strip()
    pd_codes = [c.strip() for c in req.product_codes if c.strip()]
    if not pd_codes:
        return {"store_code": store_code, "in_stock_codes": [], "stock_map": {}}

    try:
        bearer, uid = generate_daiso_auth()
        headers = {
            **DEFAULT_HEADERS,
            "Authorization": f"Bearer {bearer}",
            "X-DM-UID": uid,
            "Content-Type": "application/json"
        }

        # Chunk pd_codes in batches of 100
        chunk_size = 100
        all_stock_data = []

        async with httpx.AsyncClient(timeout=10.0) as client:
            for i in range(0, len(pd_codes), chunk_size):
                chunk = pd_codes[i:i + chunk_size]
                batch_body = [{"pdNo": code, "strCd": store_code} for code in chunk]
                resp = await client.post(
                    "https://www.daisomall.co.kr/api/pd/pdh/selStrPkupStck",
                    headers=headers,
                    json=batch_body
                )
                if resp.status_code == 200:
                    data = resp.json().get("data") or []
                    all_stock_data.extend(data)

        in_stock_codes = []
        stock_map = {}

        for item in all_stock_data:
            code = str(item.get("pdNo"))
            qty = int(item.get("stck", 0) or 0)
            sale_status = str(item.get("sleStsCd", ""))
            is_in = qty > 0 and sale_status == "1"

            status_label = "재고 보유" if qty >= 5 else "소량 보유" if qty > 0 else "매장 품절"
            stock_map[code] = {
                "product_code": code,
                "store_code": store_code,
                "quantity": qty,
                "in_stock": is_in,
                "status_label": status_label,
                "sale_status_code": sale_status
            }
            if is_in:
                in_stock_codes.append(code)

        return {
            "store_code": store_code,
            "total_queried": len(pd_codes),
            "in_stock_count": len(in_stock_codes),
            "in_stock_codes": in_stock_codes,
            "stock_map": stock_map
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"지점별 재고 필터링 중 오류: {str(e)}")
