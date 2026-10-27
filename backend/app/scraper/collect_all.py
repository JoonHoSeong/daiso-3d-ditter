import datetime
import httpx
import json
import logging
import re
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from .parser import DimensionParser

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DaisoCollector")

def parse_explicit_dims(text: str) -> Optional[tuple]:
    return DimensionParser.parse_explicit_dims(text)

def infer_stored_item_dims(name: str, cat_key: str) -> tuple:
    return DimensionParser.infer_stored_item_dims(name, cat_key)

SEARCH_CONFIG = [
    # 1. 수납 용기 & 트레이 & 바구니 (Storage Organizers)
    ('서랍정리함', 'storage', '수납/정리함'),
    ('서랍 트레이', 'storage', '수납/정리함'),
    ('깔끔정리함', 'storage', '수납/정리함'),
    ('아크릴 정리함', 'storage', '수납/정리함'),
    ('데스크 정리함', 'storage', '수납/정리함'),
    ('미니 서랍', 'storage', '수납/정리함'),
    ('회전 트레이', 'storage', '수납/정리함'),
    ('회전형 트레이', 'storage', '수납/정리함'),
    ('턴테이블', 'storage', '수납/정리함'),
    ('원형 트레이', 'storage', '수납/정리함'),
    ('수납바구니', 'storage', '수납/정리함'),
    ('팬트리 롤러 바구니', 'storage', '수납/정리함'),
    ('손잡이 바구니', 'storage', '수납/정리함'),
    ('서랍 칸막이', 'storage', '수납/정리함'),
    ('섹션 케이스', 'storage', '수납/정리함'),
    ('수저 트레이', 'storage', '수납/정리함'),
    ('리빙박스', 'storage', '수납/정리함'),
    ('와이어 수납박스', 'storage', '수납/정리함'),
    ('패브릭 수납함', 'storage', '수납/정리함'),
    ('캠핑 폴딩박스', 'storage', '수납/정리함'),
    ('폴딩박스', 'storage', '수납/정리함'),
    ('캠핑 수납', 'storage', '수납/정리함'),
    ('양념통 선반', 'storage', '수납/정리함'),
    ('계란 보관함', 'storage', '수납/정리함'),
    ('야채 보관함', 'storage', '수납/정리함'),
    ('김치통', 'storage', '수납/정리함'),
    ('쌀통', 'storage', '수납/정리함'),
    ('식기 건조대', 'storage', '수납/정리함'),
    ('프라이팬 정리대', 'storage', '수납/정리함'),

    # 2. 욕실/청소 스프레이 & 세정제
    ('욕실 청소 스프레이', 'bath_cleaning', '욕실/청소용품'),
    ('청소 스프레이', 'bath_cleaning', '욕실/청소용품'),
    ('욕실 세정제', 'bath_cleaning', '욕실/청소용품'),
    ('곰팡이 제거제', 'bath_cleaning', '욕실/청소용품'),
    ('물때 제거제', 'bath_cleaning', '욕실/청소용품'),
    ('다목적 세정제', 'bath_cleaning', '욕실/청소용품'),
    ('락스 스프레이', 'bath_cleaning', '욕실/청소용품'),
    ('유리 세정제', 'bath_cleaning', '욕실/청소용품'),
    ('배수구 세정제', 'bath_cleaning', '욕실/청소용품'),
    ('변기 세정제', 'bath_cleaning', '욕실/청소용품'),
    ('스티커 제거제', 'bath_cleaning', '욕실/청소용품'),
    ('기름때 클리너', 'bath_cleaning', '욕실/청소용품'),
    ('청소솔', 'bath_cleaning', '욕실/청소용품'),
    ('수세미', 'bath_cleaning', '욕실/청소용품'),
    ('고무장갑', 'bath_cleaning', '욕실/청소용품'),

    # 3. 욕실/세면용품
    ('핸드워시 펌프', 'bath_body', '욕실/세면용품'),
    ('샴푸 500ml', 'bath_body', '욕실/세면용품'),
    ('바디워시', 'bath_body', '욕실/세면용품'),
    ('클렌징폼', 'bath_body', '욕실/세면용품'),
    ('치약', 'bath_body', '욕실/세면용품'),
    ('칫솔 4개입', 'bath_body', '욕실/세면용품'),
    ('구강청결제', 'bath_body', '욕실/세면용품'),
    ('샤워타월', 'bath_body', '욕실/세면용품'),
    ('면도기', 'bath_body', '욕실/세면용품'),

    # 4. 뷰티 & 화장품
    ('스킨케어', 'beauty', '뷰티/화장품'),
    ('선크림', 'beauty', '뷰티/화장품'),
    ('마스크팩', 'beauty', '뷰티/화장품'),
    ('쿠션', 'beauty', '뷰티/화장품'),
    ('립스틱', 'beauty', '뷰티/화장품'),
    ('향수', 'beauty', '뷰티/화장품'),
    ('화장솜', 'beauty', '뷰티/화장품'),
    ('면봉', 'beauty', '뷰티/화장품'),
    ('매니큐어', 'beauty', '뷰티/화장품'),
    ('메이크업 브러시', 'beauty', '뷰티/화장품'),

    # 5. 문구 & 사무용품
    ('볼펜 3색', 'stationery', '문구/사무용품'),
    ('형광펜', 'stationery', '문구/사무용품'),
    ('가위', 'stationery', '문구/사무용품'),
    ('커터칼', 'stationery', '문구/사무용품'),
    ('박스테이프', 'stationery', '문구/사무용품'),
    ('포스트잇', 'stationery', '문구/사무용품'),
    ('스프링노트', 'stationery', '문구/사무용품'),
    ('스테이플러', 'stationery', '문구/사무용품'),
    ('화일철', 'stationery', '문구/사무용품'),
    ('지우개', 'stationery', '문구/사무용품'),

    # 6. 디지털 & 테크 & 공구
    ('C타입 케이블', 'digital_tools', '디지털/공구'),
    ('고속 충전기', 'digital_tools', '디지털/공구'),
    ('보조배터리', 'digital_tools', '디지털/공구'),
    ('알카라인 건전지', 'digital_tools', '디지털/공구'),
    ('멀티탭 3구', 'digital_tools', '디지털/공구'),
    ('십자 드라이버', 'digital_tools', '디지털/공구'),
    ('줄자 3m', 'digital_tools', '디지털/공구'),
    ('순간접착제', 'digital_tools', '디지털/공구'),
    ('글루건', 'digital_tools', '디지털/공구'),

    # 7. 주방 소모품 & 식품 & 텀블러
    ('주방세제 펌프', 'kitchen_food', '주방/식품용품'),
    ('주방세제 1L', 'kitchen_food', '주방/식품용품'),
    ('베이킹소다 1kg', 'kitchen_food', '주방/식품용품'),
    ('과탄산소다', 'kitchen_food', '주방/식품용품'),
    ('구연산', 'kitchen_food', '주방/식품용품'),
    ('지퍼백 중형', 'kitchen_food', '주방/식품용품'),
    ('위생장갑 100매', 'kitchen_food', '주방/식품용품'),
    ('종이호일', 'kitchen_food', '주방/식품용품'),
    ('크린랩', 'kitchen_food', '주방/식품용품'),
    ('스텐 텀블러', 'kitchen_food', '주방/식품용품'),
    ('머그컵', 'kitchen_food', '주방/식품용품'),
    ('참소스', 'kitchen_food', '주방/식품용품'),
    ('원두커피', 'kitchen_food', '주방/식품용품'),

    # 8. 생활 & 패션잡화
    ('섬유탈취제 스프레이', 'living_fashion', '생활/패션잡화'),
    ('탈취제 스프레이', 'living_fashion', '생활/패션잡화'),
    ('테이프크리너', 'living_fashion', '생활/패션잡화'),
    ('물티슈 캡형', 'living_fashion', '생활/패션잡화'),
    ('소독 스프레이', 'living_fashion', '생활/패션잡화'),
    ('에어컨 세정제', 'living_fashion', '생활/패션잡화'),
    ('덧신 양말', 'living_fashion', '생활/패션잡화'),
    ('남성 양말', 'living_fashion', '생활/패션잡화'),
    ('여성 스타킹', 'living_fashion', '생활/패션잡화'),
    ('여행용 파우치', 'living_fashion', '생활/패션잡화'),
    ('3단 우산', 'living_fashion', '생활/패션잡화'),
    ('EVA 슬리퍼', 'living_fashion', '생활/패션잡화'),
    ('손톱깎이 세트', 'living_fashion', '생활/패션잡화'),

    # 9. 반려동물 & 취미
    ('강아지 간식', 'pet_hobby', '반려동물/취미'),
    ('고양이 츄르', 'pet_hobby', '반려동물/취미'),
    ('애견 배변패드', 'pet_hobby', '반려동물/취미'),
    ('강아지 장난감', 'pet_hobby', '반려동물/취미'),
    ('캠핑 조명', 'pet_hobby', '반려동물/취미')
]

CATEGORY_COLORS = {
    "storage": "#BAE6FD",          # Ice Blue for Storage Organizers
    "bath_cleaning": "#38BDF8",    # Bright Cyan for Cleaning Sprays
    "bath_body": "#67E8F9",        # Soft Aqua for Bath & Body
    "beauty": "#F472B6",           # Vibrant Pink for Cosmetics
    "stationery": "#FBBF24",       # Sunny Amber for Stationery
    "digital_tools": "#A78BFA",    # Purple for Digital & Tools
    "kitchen_food": "#FDE047",     # Warm Kitchen Yellow
    "living_fashion": "#FB7185",   # Coral Rose for Fashion & Living
    "pet_hobby": "#34D399"         # Fresh Mint for Pets & Hobby
}

SYNC_STATUS = {
    "is_running": False,
    "last_sync": None,
    "total_products": 0,
    "last_error": None
}

def crawl_daiso_catalog() -> List[Dict[str, Any]]:
    global SYNC_STATUS
    SYNC_STATUS["is_running"] = True
    SYNC_STATUS["last_error"] = None

    search_api = "https://www.daisomall.co.kr/ssn/search/Search"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*"
    }

    base_dir = Path(__file__).resolve().parent.parent.parent
    backend_data_path = base_dir / "data" / "daiso_organizers.json"
    meta_path = base_dir / "data" / "sync_meta.json"

    collected_products = {}
    if backend_data_path.exists():
        try:
            with open(backend_data_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
                for item in existing:
                    if str(item.get("id", "")).startswith("daiso-"):
                        collected_products[item["id"]] = item
            logger.info(f"Loaded {len(collected_products)} base products.")
        except Exception as e:
            logger.warning(f"Failed to load baseline: {e}")

    try:
        with httpx.Client(headers=headers, timeout=12.0) as client:
            # 1. Store-wide exhaustive pagination across all Daiso departments (All 308 pages = ~30,000 items)
            logger.info("Beginning store-wide exhaustive pagination across all Daiso departments (including sold-out items, excluding wholesale)...")
            
            # Determine total size dynamically
            total_pages = 310
            try:
                init_res = client.get("https://www.daisomall.co.kr/ssn/search/Search?cntPerPage=100&pageNum=1&isNoTypo=1")
                if init_res.status_code == 200:
                    init_data = init_res.json()
                    ts = init_data.get("resultSet", {}).get("result", [{}])[0].get("totalSize", 30777)
                    total_pages = (ts + 99) // 100
                    logger.info(f"Daiso official store has {ts:,} items across {total_pages} pages.")
            except Exception as e:
                logger.warning(f"Could not determine total pages: {e}")

            for page_num in range(1, total_pages + 1):
                try:
                    url = f"https://www.daisomall.co.kr/ssn/search/Search?cntPerPage=100&pageNum={page_num}&isNoTypo=1"
                    resp = client.get(url)
                    if resp.status_code != 200:
                        continue
                    data = resp.json()
                    docs = data.get("resultSet", {}).get("result", [{}])[0].get("resultDocuments", [])
                    if not docs:
                        break

                    for doc in docs:
                        pd_no = str(doc.get("pdNo", ""))
                        # Exclude only wholesale bulk boxes (B20... or B...)
                        if not pd_no or pd_no.startswith("B") or pd_no.startswith("b"):
                            continue

                        price_str = str(doc.get("pdPrc", "1000"))
                        try:
                            price = int(float(price_str))
                        except (ValueError, TypeError):
                            price = 1000

                        # Wholesale price threshold filter (> 10,000 KRW)
                        if price < 500 or price > 10000:
                            continue

                        is_sold_out = (doc.get("soldOutYn") == "Y") or (doc.get("sleStsCd") != "03")

                        name = doc.get("exhPdNm") or doc.get("pdNm") or ""
                        if not name:
                            continue

                        large_cat = doc.get("exhLargeCtgrNm") or ""
                        mid_cat = doc.get("exhMiddleCtgrNm") or ""

                        # Category mapping
                        if "수납" in large_cat or "정리" in large_cat or "수납" in mid_cat or "정리" in mid_cat:
                            cat_key, cat_label = "storage", "수납/정리함"
                        elif "청소" in large_cat or "욕실" in large_cat:
                            if any(k in name for k in ["락스", "세제", "클리너", "스프레이", "분무", "탈취", "제거", "솔", "수세미", "걸레", "빗자루"]):
                                cat_key, cat_label = "bath_cleaning", "욕실/청소용품"
                            else:
                                cat_key, cat_label = "bath_body", "욕실/세면용품"
                        elif "뷰티" in large_cat or "위생" in large_cat:
                            cat_key, cat_label = "beauty", "뷰티/화장품"
                        elif "문구" in large_cat or "팬시" in large_cat:
                            cat_key, cat_label = "stationery", "문구/사무용품"
                        elif "공구" in large_cat or "디지털" in large_cat:
                            cat_key, cat_label = "digital_tools", "디지털/공구"
                        elif "주방" in large_cat or "식품" in large_cat:
                            cat_key, cat_label = "kitchen_food", "주방/식품용품"
                        elif "패션" in large_cat or "잡화" in large_cat or "인테리어" in large_cat or "원예" in large_cat:
                            cat_key, cat_label = "living_fashion", "생활/패션잡화"
                        elif "반려동물" in large_cat or "취미" in large_cat or "스포츠" in large_cat or "레저" in large_cat or "유아" in large_cat or "완구" in large_cat:
                            cat_key, cat_label = "pet_hobby", "반려동물/취미"
                        else:
                            cat_key, cat_label = "living_fashion", "생활/패션잡화"

                        item_id = f"daiso-{pd_no}"
                        clean_name = re.sub(r'\[.*?\]', '', name).strip() or name
                        prev = collected_products.get(item_id)

                        dims = parse_explicit_dims(clean_name)
                        dim_source = "title_regex"
                        if not dims:
                            kw_text = str(doc.get("keywdCn", ""))
                            dims = parse_explicit_dims(kw_text)
                        if not dims:
                            if prev and prev.get("dim_source") == "official_spec":
                                dims = (prev["width"], prev["depth"], prev["height"])
                                dim_source = "official_spec"
                            else:
                                dims = infer_stored_item_dims(clean_name, cat_key)
                                dim_source = "inferred"

                        if dims:
                            w, d, h = DimensionParser.normalize_packaged_dims(clean_name, cat_key, dims[0], dims[1], dims[2])
                            if 1.0 <= w <= 160.0 and 1.0 <= d <= 160.0 and 0.5 <= h <= 100.0:
                                rel_img = doc.get("pdImgUrl", "")
                                img_url = f"https://cdn.daisomall.co.kr{rel_img}" if rel_img and rel_img.startswith("/") else (rel_img or "")
                                desc_prefix = "규격(추정)" if dim_source == "inferred" else "규격"
                                collected_products[item_id] = {
                                    "id": item_id,
                                    "item_code": pd_no,
                                    "name": clean_name,
                                    "category": cat_key,
                                    "category_label": cat_label,
                                    "width": round(w, 1),
                                    "depth": round(d, 1),
                                    "height": round(h, 1),
                                    "dim_source": dim_source,
                                    "price": price,
                                    "color": CATEGORY_COLORS.get(cat_key, "#BAE6FD"),
                                    "image_url": img_url,
                                    "is_sold_out": is_sold_out,
                                    "description": f"{desc_prefix}: {round(w, 1)} × {round(d, 1)} × {round(h, 1)} cm (₩{price:,})" + (" [일시품절]" if is_sold_out else ""),
                                    "mall_url": f"https://www.daisomall.co.kr/pd/pdr/SCR_PDR_0001?pdNo={pd_no}"
                                }

                    if page_num % 25 == 0 or page_num == total_pages:
                        logger.info(f"Page {page_num}/{total_pages} crawled. Total retail items so far: {len(collected_products):,}")
                    time.sleep(0.03)
                except Exception as e:
                    logger.error(f"Error on page {page_num}: {e}")

            # 2. Targeted searches for specialty organizer keywords
            for keyword, cat_key, cat_label in SEARCH_CONFIG:
                logger.info(f"Fetching '{keyword}' ({cat_label})...")
                try:
                    params = {"searchTerm": keyword, "cntPerPage": 40, "isNoTypo": 1}
                    resp = client.get(search_api, params=params)
                    if resp.status_code != 200:
                        continue

                    data = resp.json()
                    res_blocks = data.get("resultSet", {}).get("result", [])
                    docs = res_blocks[0].get("resultDocuments", []) if res_blocks else []

                    for doc in docs:
                        pd_no = str(doc.get("pdNo", "")).strip()
                        name = str(doc.get("exhPdNm", "") or doc.get("pdNm", "")).strip()
                        if not pd_no or not name:
                            continue

                        # Filter wholesale boxes & bulk codes
                        if pd_no.startswith("B") or pd_no.startswith("b"):
                            continue

                        raw_prc = str(doc.get("pdPrc", "1000"))
                        try:
                            price = int(re.sub(r'[^0-9]', '', raw_prc))
                        except:
                            price = 1000

                        if price > 10000:
                            continue

                        item_id = f"daiso-{pd_no}"
                        clean_name = re.sub(r'\[.*?\]', '', name).strip() or name
                        prev = collected_products.get(item_id)

                        # Parse explicit dimensions first, then preserve official_spec, then infer
                        dims = parse_explicit_dims(clean_name)
                        dim_source = "title_regex"
                        if not dims:
                            kw_text = str(doc.get("keywdCn", ""))
                            dims = parse_explicit_dims(kw_text)
                        if not dims:
                            if prev and (prev.get("dim_source") == "official_spec" or (prev["width"], prev["depth"], prev["height"]) != (10.0, 10.0, 10.0)):
                                dims = (prev["width"], prev["depth"], prev["height"])
                                dim_source = prev.get("dim_source", "official_spec")
                            else:
                                dims = infer_stored_item_dims(clean_name, cat_key)
                                dim_source = "inferred"

                        if dims:
                            w, d, h = DimensionParser.normalize_packaged_dims(clean_name, cat_key, dims[0], dims[1], dims[2])
                            if not (1.0 <= w <= 160.0 and 1.0 <= d <= 160.0 and 0.5 <= h <= 100.0):
                                continue

                            rel_img = doc.get("pdImgUrl", "")
                            img_url = f"https://cdn.daisomall.co.kr{rel_img}" if rel_img and rel_img.startswith("/") else (rel_img or "")

                            is_sold_out_flag = (doc.get("soldOutYn") == "Y") or (doc.get("sleStsCd") != "03")
                            desc_prefix = "규격(추정)" if dim_source == "inferred" else "규격"
                            collected_products[item_id] = {
                                "id": item_id,
                                "item_code": pd_no,
                                "name": clean_name,
                                "category": cat_key,
                                "category_label": cat_label,
                                "width": round(w, 1),
                                "depth": round(d, 1),
                                "height": round(h, 1),
                                "dim_source": dim_source,
                                "price": price,
                                "color": CATEGORY_COLORS.get(cat_key, "#BAE6FD"),
                                "image_url": img_url,
                                "is_sold_out": is_sold_out_flag,
                                "description": f"{desc_prefix}: {round(w, 1)} × {round(d, 1)} × {round(h, 1)} cm (₩{price:,})" + (" [일시품절]" if is_sold_out_flag else ""),
                                "mall_url": f"https://www.daisomall.co.kr/pd/pdr/SCR_PDR_0001?pdNo={pd_no}"
                            }

                except Exception as e:
                    logger.error(f"Error while crawling '{keyword}': {e}")
                time.sleep(0.04)

        final_list = list(collected_products.values())
        final_list.sort(key=lambda x: (0 if x.get("image_url") else 1))

        backend_data_path.parent.mkdir(parents=True, exist_ok=True)
        with open(backend_data_path, "w", encoding="utf-8") as f:
            json.dump(final_list, f, ensure_ascii=False, indent=2)

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        SYNC_STATUS["last_sync"] = now_str
        SYNC_STATUS["total_products"] = len(final_list)
        SYNC_STATUS["is_running"] = False

        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(SYNC_STATUS, f, ensure_ascii=False, indent=2)

        logger.info(f"Sync complete! Total Products: {len(final_list)}")
        return final_list

    except Exception as e:
        SYNC_STATUS["is_running"] = False
        SYNC_STATUS["last_error"] = str(e)
        logger.error(f"Sync failed: {e}")
        return list(collected_products.values())

def get_sync_status() -> Dict[str, Any]:
    base_dir = Path(__file__).resolve().parent.parent.parent
    meta_path = base_dir / "data" / "sync_meta.json"
    if meta_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return SYNC_STATUS

if __name__ == "__main__":
    crawl_daiso_catalog()
