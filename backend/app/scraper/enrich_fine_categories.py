import asyncio
import httpx
import json
import logging
import re
import time
from pathlib import Path
from typing import Dict, Any, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("FineCategoryEnricher")

def infer_fallback_category(name: str) -> Tuple[str, str, str]:
    name_l = name.lower()
    
    # 1. Food / Seasoning / Drinks
    if any(k in name_l for k in ["양념", "후추", "소금", "고춧가루", "간장", "식초", "올리브유", "참기름", "들기름", "시즈닝", "카레", "짜장", "된장", "고추장", "쌈장", "맛술", "굴소스", "케첩", "마요네즈"]):
        return "식품", "양념/조미료", "조미료"
    if any(k in name_l for k in ["과자", "초콜릿", "사탕", "젤리", "쿠키", "스낵", "칩", "파이", "비스킷", "캔디"]):
        return "식품", "간식/과자", "스낵"
    if any(k in name_l for k in ["커피", "티백", "녹차", "홍차", "원두", "라떼", "음료", "생수", "탄산", "주스", "콜라", "사이다", "식혜"]):
        return "식품", "음료/차", "음료"
    if any(k in name_l for k in ["김치", "햇반", "라면", "국수", "통조림", "스팸", "참치", "골뱅이", "만두", "치즈", "버터"]):
        return "식품", "가공식품", "면류/통조림"
        
    # 2. Kitchen / Cookware / Food Storage
    if any(k in name_l for k in ["밀폐용기", "반찬통", "김치통", "보관용기", "찬합", "유리용기", "스마트씰", "말랑핏", "도시락"]):
        return "주방용품", "밀폐/보관/저장용기", "식품보관용기"
    if any(k in name_l for k in ["수저", "숟가락", "젓가락", "포크", "나이프", "티스푼", "디저트포크"]):
        return "주방용품", "수저/커트러리", "커트러리"
    if any(k in name_l for k in ["그릇", "접시", "공기", "대접", "찬기", "식기", "도기", "도자기", "나눔접시", "소스볼"]):
        return "주방용품", "식기/그릇/트레이", "식기류"
    if any(k in name_l for k in ["냄비", "프라이팬", "후라이팬", "웍", "뚝배기", "주전자"]):
        return "주방용품", "조리도구", "냄비/팬"
    if any(k in name_l for k in ["국자", "뒤집개", "집게", "주걱", "채칼", "가위", "식도", "과도", "도마", "거품기", "키친툴"]):
        return "주방용품", "조리도구", "조리기구"
    if any(k in name_l for k in ["머그", "텀블러", "물병", "보틀", "물통", "유리잔", "소주잔", "맥주잔", "와인잔"]):
        return "주방용품", "잔/컵/물병", "컵/텀블러"
    if any(k in name_l for k in ["종이호일", "쿠킹호일", "크린랩", "위생백", "지퍼백", "크린백", "종이컵"]):
        return "주방용품", "일회용품", "위생용품"

    # 3. Storage Organizers
    if any(k in name_l for k in ["서랍정리함", "정리함", "트레이", "칸막이", "섹션", "디바이더", "모듈", "소품함"]):
        return "수납/정리", "수납정리함", "서랍정리용품"
    if any(k in name_l for k in ["바구니", "바스켓", "핸들바구니", "롤러바구니", "멀티바스켓"]):
        return "수납/정리", "바구니류", "플라스틱바구니"
    if any(k in name_l for k in ["리빙박스", "폴딩박스", "수납박스", "수납함", "정리박스", "서랍장"]):
        return "수납/정리", "수납박스", "리빙박스"

    # 4. Beauty / Skincare / Cleansing
    if any(k in name_l for k in ["클렌징", "세안", "리무버", "립앤아이", "폼클렌징", "클렌징폼", "클렌징오일", "오일밤", "클렌징워터", "클렌징티슈"]):
        return "뷰티/위생", "클렌징", "오일/밤/폼"
    if any(k in name_l for k in ["스킨", "토너", "로션", "에멀전", "에센스", "세럼", "앰플", "수분크림", "영양크림", "미스트", "선크림"]):
        return "뷰티/위생", "스킨케어", "기초화장품"
    if any(k in name_l for k in ["립스틱", "틴트", "쿠션", "팩트", "파운데이션", "아이섀도우", "아이라이너", "마스카라", "블러셔", "립밤", "매니큐어"]):
        return "뷰티/위생", "메이크업", "색조화장품"
    if any(k in name_l for k in ["샴푸", "린스", "트리트먼트", "헤어팩", "헤어오일", "헤어에센스", "헤어스프레이", "헤어왁스"]):
        return "뷰티/위생", "헤어케어", "샴푸/린스/오일"
    if any(k in name_l for k in ["바디워시", "바디로션", "바디오일", "바디스크럽", "핸드크림", "풋크림", "입욕제"]):
        return "뷰티/위생", "바디케어", "바디보습"
    if any(k in name_l for k in ["브러시", "퍼프", "화장솜", "면봉", "뷰러", "손톱깎이", "네일팁", "기름종이"]):
        return "뷰티/위생", "뷰티소품", "화장소품"
    if any(k in name_l for k in ["치약", "칫솔", "치실", "치간칫솔", "가글", "구강청결제", "혀클리너"]):
        return "뷰티/위생", "구강용품", "치약/칫솔"

    # 5. Cleaning / Bath
    if any(k in name_l for k in ["세제", "락스", "세정제", "클리너", "트래펑", "표백제", "곰팡이제거", "탈취제", "섬유유연제"]):
        return "청소/욕실", "주방/청소세제", "세정세제"
    if any(k in name_l for k in ["청소솔", "수세미", "걸레", "스펀지", "밀대", "빗자루", "쓰레받기", "먼지떨이", "롤클리너"]):
        return "청소/욕실", "청소용품", "청소도구"
    if any(k in name_l for k in ["비누", "샤워타월", "비누받침", "욕실화", "샤워기", "변기솔", "흡착봉", "욕실선반"]):
        return "청소/욕실", "욕실용품", "욕실소품"

    # 6. Stationery / Office
    if any(k in name_l for k in ["볼펜", "샤프", "형광펜", "사인펜", "네임펜", "만년필", "연필", "지우개", "수정테이프"]):
        return "문구/팬시", "필기용품", "필기도구"
    if any(k in name_l for k in ["노트", "다이어리", "수첩", "메모지", "포스트잇", "연습장", "스케치북"]):
        return "문구/팬시", "다이어리/노트/메모", "노트/메모"
    if any(k in name_l for k in ["가위", "커터칼", "도루코", "딱풀", "물풀", "박스테이프", "스테이플러", "클립", "펀치"]):
        return "문구/팬시", "문구/사무용품", "사무소품"
    if any(k in name_l for k in ["화일", "파일", "바인더", "서류함", "클리어화일", "L홀더"]):
        return "문구/팬시", "문구/사무용품", "파일/바인더"
    if any(k in name_l for k in ["스티커", "마스킹테이프", "데코스티커"]):
        return "문구/팬시", "스티커류", "팬시스티커"

    # 7. Digital / Tools
    if any(k in name_l for k in ["c타입", "케이블", "충전기", "어댑터", "보조배터리", "젠더", "거치대", "휴대폰", "스마트폰", "이어폰", "usb", "마우스"]):
        return "공구/디지털", "휴대폰/디지털", "모바일액세서리"
    if any(k in name_l for k in ["드라이버", "펜치", "니퍼", "스패너", "렌치", "망치", "줄자", "나사", "앙카", "절연테이프", "공구함"]):
        return "공구/디지털", "공구용품", "수공구/철물"
    if any(k in name_l for k in ["멀티탭", "건전지", "배터리", "전구", "스위치", "플러그"]):
        return "공구/디지털", "전기/조명", "전기부품"

    # 8. Fashion / Living
    if any(k in name_l for k in ["양말", "덧신", "스타킹", "타이즈", "발목양말", "스포츠양말"]):
        return "패션/잡화", "양말/스타킹", "양말류"
    if any(k in name_l for k in ["팬티", "속옷", "드로즈", "브라", "런닝", "이지웨어"]):
        return "패션/잡화", "언더웨어", "속옷류"
    if any(k in name_l for k in ["슬리퍼", "실내화", "모자", "벨트", "지갑", "가방", "파우치", "우산", "우비"]):
        return "패션/잡화", "잡화", "패션소품"
    if any(k in name_l for k in ["옷걸이", "바지걸이", "빨래집게", "건조대"]):
        return "청소/욕실", "세탁용품", "세탁걸이"
    if any(k in name_l for k in ["방향제", "디퓨저", "캔들", "룸스프레이", "시계", "액자", "쿠션", "방석"]):
        return "인테리어/원예", "인테리어소품", "방향/홈데코"

    # 9. Pet / Camping
    if any(k in name_l for k in ["강아지", "애견", "개껌", "배변패드", "고양이", "츄르", "스크래쳐", "모래"]):
        return "반려동물", "반려동물용품", "펫케어"
    if any(k in name_l for k in ["캠핑", "텐트", "타프", "체어", "화로", "랜턴", "버너"]):
        return "스포츠/레저/취미", "캠핑/여행", "캠핑용품"

    return "생활/잡화", "일반생활용품", "기타생활"


async def fetch_daiso_official_categories() -> Dict[str, Dict[str, str]]:
    logger.info("Connecting to Daiso Mall official catalog search API...")
    limits = httpx.Limits(max_connections=40, max_keepalive_connections=30)
    official_cat_map = {}
    t0 = time.time()
    
    async with httpx.AsyncClient(limits=limits, headers={"User-Agent": "Mozilla/5.0"}, timeout=15.0) as client:
        r = await client.get("https://www.daisomall.co.kr/ssn/search/Search?cntPerPage=100&pageNum=1&isNoTypo=1")
        total_size = r.json().get("resultSet", {}).get("result", [{}])[0].get("totalSize", 30500)
        total_pages = (total_size + 99) // 100
        logger.info(f"Daiso official store has {total_size:,} active products across {total_pages} pages.")
        
        chunk_size = 50
        for start_p in range(1, total_pages + 1, chunk_size):
            end_p = min(start_p + chunk_size, total_pages + 1)
            tasks = [client.get(f"https://www.daisomall.co.kr/ssn/search/Search?cntPerPage=100&pageNum={p}&isNoTypo=1") for p in range(start_p, end_p)]
            resps = await asyncio.gather(*tasks)
            for resp in resps:
                if resp.status_code == 200:
                    docs = resp.json().get("resultSet", {}).get("result", [{}])[0].get("resultDocuments", [])
                    for d in docs:
                        pd_no = str(d.get("pdNo") or "").strip()
                        if pd_no:
                            official_cat_map[pd_no] = {
                                "large": str(d.get("exhLargeCtgrNm") or "").strip(),
                                "middle": str(d.get("exhMiddleCtgrNm") or "").strip(),
                                "small": str(d.get("exhSmallCtgrNm") or "").strip(),
                                "detail": str(d.get("exhDetailCtgrNm") or "").strip()
                            }
            logger.info(f"Crawled official categories up to page {end_p - 1}/{total_pages} ({len(official_cat_map):,} items).")
            
    logger.info(f"Finished category crawl in {time.time() - t0:.2f}s.")
    return official_cat_map


def main():
    cat_map = asyncio.run(fetch_daiso_official_categories())
    
    base_dir = Path(__file__).resolve().parent.parent.parent
    backend_path = base_dir / "data" / "daiso_organizers.json"
    frontend_path = base_dir.parent / "frontend" / "src" / "data" / "daisoProducts.json"
    
    for filepath in [backend_path, frontend_path]:
        if not filepath.exists():
            continue
            
        logger.info(f"Enriching {filepath}...")
        with open(filepath, "r", encoding="utf-8") as f:
            products = json.load(f)
            
        enriched_count = 0
        from_api_count = 0
        from_fallback_count = 0
        
        for p in products:
            item_code = str(p.get("itemCode") or p.get("item_code") or "").strip()
            name = str(p.get("name") or "").strip()
            
            official = cat_map.get(item_code)
            if official and official["large"] and official["large"] not in ["", "None"]:
                large = official["large"]
                middle = official["middle"] or "기타"
                small = official["small"] or ""
                from_api_count += 1
            else:
                large, middle, small = infer_fallback_category(name)
                from_fallback_count += 1
                
            # Create full hierarchy breadcrumb string
            hierarchy_parts = [large, middle]
            if small:
                hierarchy_parts.append(small)
            hierarchy_str = " > ".join(hierarchy_parts)
            
            # Map into standard high-level category & clean labels
            clean_cat = "living_fashion"
            clean_label = "생활/잡화"
            
            if "수납" in large or "정리" in large or "수납" in middle or "바구니" in middle:
                clean_cat = "storage"
                clean_label = "수납/정리함"
            elif "식품" in large or "양념" in middle or "조미료" in middle:
                clean_cat = "food"
                clean_label = "식품/식음료"
            elif "주방" in large or "식기" in middle or "밀폐" in middle or "조리" in middle:
                clean_cat = "kitchen"
                clean_label = "주방/식기"
            elif "뷰티" in large or "화장품" in large or "메이크업" in middle or "스킨케어" in middle or "클렌징" in middle:
                clean_cat = "beauty"
                clean_label = "뷰티/화장품"
            elif "욕실" in large or "구강" in middle or "헤어" in middle or "바디" in middle:
                clean_cat = "bath_body"
                clean_label = "욕실/세면용품"
            elif "청소" in large or "세제" in middle or "세탁" in middle:
                clean_cat = "bath_cleaning"
                clean_label = "청소/세제용품"
            elif "문구" in large or "팬시" in large or "필기" in middle or "사무" in middle:
                clean_cat = "stationery"
                clean_label = "문구/사무용품"
            elif "디지털" in large or "공구" in large or "휴대폰" in middle:
                if "공구" in middle:
                    clean_cat = "tools"
                    clean_label = "공구/철물"
                else:
                    clean_cat = "digital"
                    clean_label = "디지털/모바일"
            elif "패션" in large or "양말" in middle or "언더웨어" in middle:
                clean_cat = "fashion"
                clean_label = "패션/의류잡화"
            elif "반려동물" in large:
                clean_cat = "pet"
                clean_label = "반려동물용품"
            elif "스포츠" in large or "취미" in large or "캠핑" in middle:
                clean_cat = "hobby"
                clean_label = "취미/캠핑/레저"
            elif "원예" in large or "인테리어" in large:
                clean_cat = "interior"
                clean_label = "인테리어/원예"

            p["largeCategory"] = large
            p["middleCategory"] = middle
            p["smallCategory"] = small
            p["categoryHierarchy"] = hierarchy_str
            p["category"] = clean_cat
            p["categoryLabel"] = clean_label
            enriched_count += 1
            
        logger.info(f"{filepath.name}: Enriched {enriched_count:,} products ({from_api_count:,} from Daiso API, {from_fallback_count:,} inferred).")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(products, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
