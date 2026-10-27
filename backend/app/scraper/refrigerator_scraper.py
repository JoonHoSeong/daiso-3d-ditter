import urllib.request
import urllib.parse
import json
import re
import time
from typing import List, Dict, Any, Optional

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.danawa.com/'
}

SEARCH_QUERIES = [
    # 1. 900L급 초특대형 플래그십 (삼성 & LG)
    'RM70F91R1A',
    '삼성 비스포크 900L',
    '삼성 비스포크 AI 하이브리드',
    'RF90',
    'LG 디오스 900L',
    'LG 오브제컬렉션 900L',
    'T876',
    'LG 프렌치도어 900L',

    # 2. 800L급 4도어 프리스탠딩 대용량
    '삼성 비스포크 4도어',
    'RF85C9001',
    'RF85DG9011',
    'RF85C9111',
    'LG 오브제컬렉션 4도어',
    'M874MWW451',
    'T873MEE111',
    'T875',
    'LG 디오스 T876',

    # 3. 600L급 키친핏 / 빌트인 슬림
    '삼성 비스포크 키친핏',
    'RF60C9012',
    'RF60DG9024',
    'RM70F63R2A',
    'RM70F64R1X',
    'LG 오브제 키친핏',
    'M614MWW451',
    'T613',
    'G646GBB021',

    # 4. 양문형 냉장고 (Side-by-Side)
    '삼성 비스포크 양문형',
    'RS84C5001',
    'RS84DB5002',
    'RS84T5081SL',
    'LG 디오스 양문형',
    'S834MEE10',
    'S834',
    'F756',

    # 5. 김치냉장고 (4도어 / 3도어 스탠드형)
    '삼성 비스포크 김치플러스 4도어',
    '삼성 비스포크 김치플러스 3도어',
    'RQ58C9411',
    'RQ48',
    'RQ33',
    'RK70F58',
    'LG 디오스 김치톡톡 4도어',
    'LG 디오스 김치톡톡 3도어',
    'Z490MEEF11',
    'Z509',
    'Z334',
    'Z330',

    # 6. 프리미엄 인피니트 & 컨버터블 1도어
    '삼성 비스포크 인피니트',
    'LG 무드업 냉장고',
    'RR70H39G10',
    'Q336MQQ133'
]

def fetch_search_products(query: str) -> List[Dict[str, str]]:
    url = f"https://search.danawa.com/dsearch.php?query={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers=HEADERS)
    products = []
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL):
                try:
                    data = json.loads(m.group(1))
                    if data.get('@type') == 'ItemList':
                        for it in data.get('itemListElement', []):
                            name = it.get('name', '').strip()
                            prod_url = it.get('url', '').strip()
                            image = it.get('image', '').strip()
                            keywords = ['냉장', '김치', '비스포크', '오브제', '디오스', 'RM70', 'RF', 'RS', 'RQ', 'M87', 'T87', 'T61', 'S83', 'Z49', 'Z50', 'Z33', 'G64', 'Q33']
                            if name and prod_url and any(k.lower() in name.lower() for k in keywords):
                                products.append({
                                    'name': name,
                                    'url': prod_url,
                                    'image': image
                                })
                except Exception:
                    pass
    except Exception as e:
        print(f"Error searching '{query}': {e}")
    return products

def fetch_product_detail_specs(url: str) -> Optional[Dict[str, Any]]:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode('utf-8', errors='ignore')

        desc_match = re.search(r'"description":\s*"([^"]+)"', html)
        if not desc_match:
            return None
        desc = desc_match.group(1)

        # Capacity (총용량)
        cap_match = re.search(r'총용량:\s*(\d+)L', desc)
        capacity = int(cap_match.group(1)) if cap_match else 0

        # Fridge / Freezer capacity
        fridge_cap_match = re.search(r'냉장:\s*(\d+)L', desc)
        freezer_cap_match = re.search(r'냉동:\s*(\d+)L', desc)
        fridge_cap = int(fridge_cap_match.group(1)) if fridge_cap_match else None
        freezer_cap = int(freezer_cap_match.group(1)) if freezer_cap_match else None

        # Exterior dimensions: 가로x세로(높이)x깊이 mm
        dim_match = re.search(r'(?:후면핸들(?:포함|미포함)?크기|크기)\(가로x세로x깊이\):\s*(\d+)x(\d+)x(\d+)mm', desc)
        ext_dims = None
        if dim_match:
            ext_dims = {
                'width': int(dim_match.group(1)),
                'height': int(dim_match.group(2)),
                'depth': int(dim_match.group(3))
            }

        return {
            'raw_description': desc,
            'capacity_liters': capacity,
            'fridge_liters': fridge_cap,
            'freezer_liters': freezer_cap,
            'exterior_dims': ext_dims
        }
    except Exception as e:
        print(f"Error fetching detail {url}: {e}")
        return None

def classify_refrigerator(name: str, desc: str, cap: int, ext_dims: Optional[Dict[str, int]]):
    # 1. Brand
    brand = '삼성전자' if ('삼성' in name or '삼성' in desc or name.startswith(('RF', 'RM', 'RS', 'RQ', 'RH', 'RK', 'RR'))) else 'LG전자'

    # 2. Door Type
    if '김치' in name or '김치' in desc or '김치톡톡' in name or '김치플러스' in name:
        door_type = '김치냉장고'
    elif '양문형' in name or '양문형' in desc or name.startswith(('RS', 'S83')):
        door_type = '양문형'
    elif '키친핏' in name or '키친핏' in desc or 'Fit' in name or (ext_dims and ext_dims['depth'] < 740):
        door_type = '4도어 키친핏'
    elif '1도어' in name or '컨버터블' in name:
        door_type = '1도어/소형'
    else:
        door_type = '4도어 프리스탠딩'

    # Fallback exterior dimensions if missing
    if not ext_dims:
        if door_type == '4도어 키친핏':
            ext_dims = {'width': 912, 'depth': 697, 'height': 1853}
        elif door_type == '4도어 프리스탠딩':
            ext_dims = {'width': 912, 'depth': 930 if cap >= 900 else 910, 'height': 1853}
        elif door_type == '양문형':
            ext_dims = {'width': 913, 'depth': 913, 'height': 1790}
        elif door_type == '김치냉장고':
            ext_dims = {'width': 696 if cap >= 400 else 666, 'depth': 795, 'height': 1850}
        else:
            ext_dims = {'width': 595, 'depth': 688, 'height': 1853}

    # 3. Capacity Tier
    if cap >= 900:
        cap_tier = '900L+ 초특대형'
    elif cap >= 800:
        cap_tier = '800L 대용량'
    elif cap >= 600:
        cap_tier = '600L 키친핏/슬림'
    else:
        cap_tier = '500L 이하 / 김치'

    # 4. Sub Brand / Series Lineup
    if brand == '삼성전자':
        if 'AI 하이브리드' in name or 'RM70' in name:
            sub = '비스포크 AI 하이브리드'
        elif '인피니트' in name:
            sub = '비스포크 인피니트'
        elif door_type == '김치냉장고':
            sub = '비스포크 김치플러스'
        elif door_type == '4도어 키친핏':
            sub = '비스포크 키친핏'
        elif door_type == '양문형':
            sub = '비스포크 양문형'
        else:
            sub = '비스포크 4도어'
    else:
        if door_type == '김치냉장고':
            sub = '오브제 김치톡톡'
        elif door_type == '4도어 키친핏':
            sub = '오브제 키친핏'
        elif door_type == '양문형':
            sub = '디오스 양문형'
        elif '무드업' in name:
            sub = '오브제 무드업'
        else:
            sub = '오브제컬렉션 4도어'

    # 5. Shelf Depth Type
    if door_type == '4도어 프리스탠딩':
        shelf_depth_type = '대형 깊은 선반 (46~48cm)'
    elif door_type == '4도어 키친핏':
        shelf_depth_type = '슬림 얕은 선반 (34~35cm)'
    elif door_type == '양문형':
        shelf_depth_type = '표준 깊은 선반 (42~45cm)'
    elif door_type == '김치냉장고':
        shelf_depth_type = '김치통/선반 복합 (42~45cm)'
    else:
        shelf_depth_type = '표준 선반 (38~40cm)'

    # 6. Features tags
    features = []
    text_corpus = f"{name} {desc}"
    if 'AI' in text_corpus:
        features.append('AI 절전/케어')
    if '하이브리드' in text_corpus or '펠티어' in text_corpus:
        features.append('펠티어 하이브리드')
    if '1등급' in text_corpus:
        features.append('에너지 1등급')
    if '독립냉각' in text_corpus or '트리플' in text_corpus:
        features.append('트리플 독립냉각')
    if '오토오픈' in text_corpus or '오토 오픈' in text_corpus:
        features.append('오토 오픈 도어')
    if '키친핏' in text_corpus or 'Fit' in text_corpus:
        features.append('싱크대 키친핏')
    if '정온' in text_corpus or '미세정온' in text_corpus:
        features.append('미세 정온')
    if 'UV' in text_corpus or '탈취' in text_corpus:
        features.append('UV 청정 탈취')
    if '김치' in text_corpus:
        features.append('김치 맞춤숙성')
    if cap >= 900:
        features.append('900L+ 초대용량')

    return brand, door_type, cap_tier, sub, shelf_depth_type, features, ext_dims

def compute_internal_compartments(door_type: str, ext_dims: Dict[str, int], capacity: int) -> List[Dict[str, Any]]:
    ext_w = ext_dims['width'] if ext_dims else 912
    ext_d = ext_dims['depth'] if ext_dims else 930

    if door_type == '4도어 프리스탠딩':
        shelf_w = round((ext_w - 87) / 10.0, 1)
        shelf_d = 48.0 if capacity >= 900 else (46.5 if ext_d >= 900 else 45.0)
        return [
            {
                'id': 'shelf-1',
                'name': '냉장실 1단 (상단 메인 선반)',
                'categoryLabel': '냉장실 상단',
                'zone': 'shelf',
                'dimensions': {'width': shelf_w, 'depth': shelf_d, 'height': 23.0},
                'description': '깊은 수납 바구니 4~5호, 장류, 대용량 밀폐용기 수납',
                'recommendedKeywords': ['냉장고 수납 바구니 4호', '냉장고 수납 바구니 5호', '핸들 트레이', '밀폐용기'],
                'tips': f'선반 깊이가 {shelf_d}cm로 깊어 다이소 45cm 대형 바구니가 여유 있게 들어갑니다.'
            },
            {
                'id': 'shelf-2',
                'name': '냉장실 2단 (중간 메인 반찬 선반)',
                'categoryLabel': '냉장실 중간',
                'zone': 'shelf',
                'dimensions': {'width': shelf_w, 'depth': shelf_d, 'height': 22.0},
                'description': '일상 반찬통 2단 적재, 투명 아크릴 트레이 배치',
                'recommendedKeywords': ['냉장고 수납 바구니', '투명 정리함', '모듈 트레이', '밀폐용기'],
                'tips': '투명 핸들 트레이를 나란히 배치해 반찬을 한눈에 꺼내기 좋습니다.'
            },
            {
                'id': 'shelf-3',
                'name': '냉장실 3단 (하단 와이드/접이식 선반)',
                'categoryLabel': '냉장실 하단',
                'zone': 'shelf',
                'dimensions': {'width': shelf_w, 'depth': shelf_d, 'height': 30.0},
                'description': '캔음료 2단 롤링 디스펜서, 30구 계란통, 우유 및 냄비 수납',
                'recommendedKeywords': ['캔음료', '계란 보관함 30구', '디스펜서', '회전형 원형 트레이 30'],
                'tips': '높이 30cm로 30구 계란 보관함과 대형 회전 턴테이블이 여유롭게 들어갑니다.'
            },
            {
                'id': 'crisper-left',
                'name': '신선 야채실 서랍 (좌측칸)',
                'categoryLabel': '야채/과일실',
                'zone': 'crisper',
                'dimensions': {'width': round((shelf_w - 3.5) / 2.0, 1), 'depth': round(shelf_d - 6.0, 1), 'height': 18.5},
                'description': '대파, 양파, 흙 묻은 채소 보관함 및 세움 칸막이',
                'recommendedKeywords': ['야채 보관', '칸막이', '신선 보관함'],
                'tips': '채소를 세워서 보관하면 신선도가 훨씬 오래 유지됩니다.'
            },
            {
                'id': 'door-pocket',
                'name': '냉장실 도어 포켓 바스켓',
                'categoryLabel': '도어 포켓',
                'zone': 'door',
                'dimensions': {'width': 38.0, 'depth': 16.5, 'height': 18.0},
                'description': '2L 생수 2열, 소스병, 드레싱 및 튜브 양념 홀더',
                'recommendedKeywords': ['도어용 조립형 칸막이', '틈새 수납', '소스 홀더'],
                'tips': '도어 칸막이를 끼우면 문을 세게 열어도 병이 넘어지지 않습니다.'
            },
            {
                'id': 'freezer-drawer',
                'name': '냉동실 대형 슬라이딩 서랍',
                'categoryLabel': '냉동실 하단',
                'zone': 'freezer_drawer',
                'dimensions': {'width': 36.0, 'depth': 40.0, 'height': 22.0},
                'description': '소분 육류, 냉동밥, 생선 세워서 보관',
                'recommendedKeywords': ['소분 용기', '냉동 트레이', '지퍼백'],
                'tips': '세워서 보관 트레이를 쓰면 원하는 냉동 재료를 책처럼 바로 뽑아 씁니다.'
            }
        ]

    elif door_type == '4도어 키친핏':
        shelf_w = round((ext_w - 160) / 10.0, 1) if ext_w > 850 else 74.0
        shelf_d = 34.5
        return [
            {
                'id': 'shelf-main',
                'name': '키친핏 냉장실 메인 선반 (1~2단)',
                'categoryLabel': '키친핏 선반',
                'zone': 'shelf',
                'dimensions': {'width': shelf_w, 'depth': shelf_d, 'height': 21.0},
                'description': '깊이 30~34cm 중형 트레이 전용 (40cm 이상 대형 트레이 불가)',
                'recommendedKeywords': ['냉장고 정리 핸들 트레이 슬림', '냉장고 수납 바구니 2호', '냉장고 수납 바구니 3호'],
                'tips': '키친핏은 깊이가 34.5cm이므로 반드시 34cm 이하 슬림 트레이를 써야 문이 닫힙니다.'
            },
            {
                'id': 'shelf-bottom',
                'name': '키친핏 냉장실 하단 선반',
                'categoryLabel': '키친핏 하단',
                'zone': 'shelf',
                'dimensions': {'width': shelf_w, 'depth': shelf_d, 'height': 26.0},
                'description': '계란 15구/30구, 캔음료 홀더, 23.5cm 회전 트레이',
                'recommendedKeywords': ['계란 보관함 30구', '캔음료', '회전형 원형 트레이 23.5'],
                'tips': '회전 트레이는 30cm 대신 23.5cm 규격을 써야 문에 걸리지 않습니다.'
            },
            {
                'id': 'crisper',
                'name': '키친핏 신선 야채실 서랍',
                'categoryLabel': '야채실',
                'zone': 'crisper',
                'dimensions': {'width': 35.0, 'depth': 28.0, 'height': 16.0},
                'description': '슬림 야채실 전용 소형 칸막이',
                'recommendedKeywords': ['야채 보관', '칸막이'],
                'tips': '서랍 깊이가 28cm로 컴팩트하므로 소형 칸막이 2개를 나란히 두세요.'
            },
            {
                'id': 'freezer',
                'name': '키친핏 냉동실 서랍',
                'categoryLabel': '냉동실 서랍',
                'zone': 'freezer_drawer',
                'dimensions': {'width': 33.0, 'depth': 28.0, 'height': 18.0},
                'description': '냉동밥 소분용기 및 컴팩트 냉동 트레이',
                'recommendedKeywords': ['소분 용기', '냉동 트레이'],
                'tips': '소분 용기 4~6개를 2열로 정갈하게 수납할 수 있습니다.'
            }
        ]

    elif door_type == '양문형':
        return [
            {
                'id': 'fridge-shelf',
                'name': '우측 냉장실 메인 선반 (1~3단)',
                'categoryLabel': '양문형 냉장실',
                'zone': 'shelf',
                'dimensions': {'width': 43.0, 'depth': 45.0, 'height': 24.0},
                'description': '폭 15~20cm 모듈 트레이 2열 배치에 완벽',
                'recommendedKeywords': ['냉장고 수납 바구니 4호', '핸들 트레이', '밀폐용기'],
                'tips': '폭 20cm 트레이 2개를 나란히 넣으면 선반 폭 43cm에 빈틈없이 들어맞습니다.'
            },
            {
                'id': 'fridge-crisper',
                'name': '우측 냉장실 하단 야채실 서랍',
                'categoryLabel': '양문형 야채실',
                'zone': 'crisper',
                'dimensions': {'width': 40.0, 'depth': 40.0, 'height': 20.0},
                'description': '깊은 서랍형 야채/과일 보관함',
                'recommendedKeywords': ['물받이형 밀폐용기', '야채 보관'],
                'tips': '대용량 야채 보관함 1개와 칸막이를 결합해 쓰기 좋습니다.'
            },
            {
                'id': 'freezer-shelf',
                'name': '좌측 냉동실 메인 선반 (1~3단)',
                'categoryLabel': '양문형 냉동실',
                'zone': 'freezer_tray',
                'dimensions': {'width': 33.0, 'depth': 42.0, 'height': 23.0},
                'description': '냉동밥 소분 용기, 냉동 피자, 소분 육류 2열 수납',
                'recommendedKeywords': ['소분 용기', '냉동 트레이', '지퍼백'],
                'tips': '폭 15cm 냉동 트레이 2개를 앞뒤로 길게 수납하면 깔끔합니다.'
            }
        ]

    else: # 김치냉장고 (4도어)
        return [
            {
                'id': 'top-shelf',
                'name': '상칸 다목적 와이드 선반 (1~2단)',
                'categoryLabel': '김치 상칸 선반',
                'zone': 'shelf',
                'dimensions': {'width': 64.0, 'depth': 44.0, 'height': 25.0},
                'description': '와인, 맥주, 수박, 대형 반찬통 및 회전 트레이',
                'recommendedKeywords': ['회전형 원형 트레이 30', '냉장고 수납 바구니 4호', '캔음료'],
                'tips': '상칸은 높이가 25cm로 여유로워 캔맥주 디스펜서와 와인 수납에 제격입니다.'
            },
            {
                'id': 'mid-drawer',
                'name': '중칸 김치통 서랍 (김치통 4개칸)',
                'categoryLabel': '김치 중칸 서랍',
                'zone': 'freezer_drawer',
                'dimensions': {'width': 48.0, 'depth': 45.0, 'height': 28.0},
                'description': '김치통 4개 또는 야채/과일/육류 대량 보관 바스켓',
                'recommendedKeywords': ['물받이형 밀폐용기 5.5L', '수납 바스켓', '김치통'],
                'tips': '김치통 대신 다이소 5.5L 대형 물받이 밀폐용기를 넣으면 대형 야채실로 쓸 수 있습니다.'
            },
            {
                'id': 'low-drawer',
                'name': '하칸 쌀/잡곡/야채 보관 서랍',
                'categoryLabel': '김치 하칸 서랍',
                'zone': 'freezer_drawer',
                'dimensions': {'width': 48.0, 'depth': 42.0, 'height': 26.0},
                'description': '쌀통, 잡곡통, 감자/고구마 뿌리채소 보관',
                'recommendedKeywords': ['쌀통', '밀폐용기', '수납 바구니'],
                'tips': '잡곡통을 나란히 세워두면 깔끔한 곡물 저장고가 완성됩니다.'
            }
        ]

def scrape_all_refrigerators():
    print("=== Starting Real Multi-Category Refrigerator Scraper ===")
    seen_urls = set()
    raw_products = []

    for q in SEARCH_QUERIES:
        print(f"Scraping query: {q}...")
        found = fetch_search_products(q)
        for f in found:
            if f['url'] not in seen_urls:
                seen_urls.add(f['url'])
                raw_products.append(f)
        time.sleep(0.2)

    print(f"Total unique refrigerator models found: {len(raw_products)}")

    scraped_models = []

    # Always ensure user's exact model RM70F91R1A is the prioritized 1st entry
    scraped_models.append({
        'id': 'samsung-rm70f91r1a-901l',
        'brand': '삼성전자',
        'series': '비스포크 AI 하이브리드 901L (RM70F91R1A)',
        'modelCode': 'RM70F91R1A',
        'capacityLiters': 901,
        'fridgeLiters': 535,
        'freezerLiters': 366,
        'type': '4도어 프리스탠딩',
        'doorType': '4도어 프리스탠딩',
        'capacityTier': '900L+ 초특대형',
        'subBrand': '비스포크 AI 하이브리드',
        'shelfDepthType': '대형 깊은 선반 (46~48cm)',
        'features': ['⭐ 우리집 냉장고', 'AI 하이브리드', '펠티어 소자', '에너지 1등급', '트리플 독립냉각', '900L+ 초대용량'],
        'dimensionsExterior': {'width': 912, 'depth': 930, 'height': 1853},
        'isUserSelected': True,
        'tag': '⭐ 우리집 모델 (RM70F91R1A · 901L 플래그십)',
        'description': '삼성 비스포크 최신 AI 하이브리드 쿨링 901L 냉장고로, 선반 깊이가 48cm에 달해 40~45cm 대형 수납 바구니가 여유 있게 들어갑니다.',
        'imageUrl': 'https://img.danuri.io/catalog-image/326/972/078/994ee8f849da4c2bb321b6e073552889.jpeg?shrink=130:130',
        'sourceUrl': 'https://prod.danawa.com/info/?pcode=78972326',
        'compartments': compute_internal_compartments('4도어 프리스탠딩', {'width': 912, 'depth': 930, 'height': 1853}, 901)
    })

    for p in raw_products:
        name = p['name']
        code_match = re.search(r'\b([A-Z]{1,2}[0-9]{2}[A-Z0-9]+)\b', name)
        model_code = code_match.group(1) if code_match else ''

        if model_code == 'RM70F91R1A':
            continue

        specs = fetch_product_detail_specs(p['url'])
        desc = specs['raw_description'] if specs else ''
        cap = (specs['capacity_liters'] if specs else 0) or (901 if '901' in name else (905 if '905' in name else (875 if '875' in name or '87' in name else 610)))
        raw_ext_dims = specs['exterior_dims'] if specs else None

        brand, door_type, cap_tier, sub_brand, shelf_depth_type, features, ext_dims = classify_refrigerator(
            name, desc, cap, raw_ext_dims
        )

        clean_name = re.sub(r'\(전국\s*무료\)|\(공식인증\)|\(색상선택형\)|\(화이트\)|\(기본형\)', '', name).strip()
        tag = f"{brand} · {cap}L · {door_type}"

        model_id = f"{brand.lower()}-{model_code.lower() if model_code else str(len(scraped_models))}"
        compartments = compute_internal_compartments(door_type, ext_dims, cap)

        scraped_models.append({
            'id': model_id,
            'brand': brand,
            'series': clean_name,
            'modelCode': model_code,
            'capacityLiters': cap,
            'fridgeLiters': specs['fridge_liters'] if specs else None,
            'freezerLiters': specs['freezer_liters'] if specs else None,
            'type': door_type,
            'doorType': door_type,
            'capacityTier': cap_tier,
            'subBrand': sub_brand,
            'shelfDepthType': shelf_depth_type,
            'features': features,
            'dimensionsExterior': ext_dims,
            'isUserSelected': False,
            'tag': tag,
            'description': f"{clean_name} (총 {cap}L, 외형 {ext_dims['width']}x{ext_dims['depth']}x{ext_dims['height']}mm)",
            'imageUrl': p['image'],
            'sourceUrl': p['url'],
            'compartments': compartments
        })

        if len(scraped_models) >= 80:
            break
        time.sleep(0.15)

    print(f"Successfully processed {len(scraped_models)} authentic categorized refrigerator models.")

    # Save to frontend JSON
    out_path = '/Users/joonhoseong/Desktop/workspace/Personal/daiso-3d-fitter/frontend/src/data/scrapedFridgeModels.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(scraped_models, f, ensure_ascii=False, indent=2)
    print(f"Saved to {out_path}")

if __name__ == '__main__':
    scrape_all_refrigerators()
