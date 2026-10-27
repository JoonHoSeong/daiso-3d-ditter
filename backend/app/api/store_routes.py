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
