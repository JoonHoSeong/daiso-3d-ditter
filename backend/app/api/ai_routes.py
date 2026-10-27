import json
import re
import time
import httpx
from pathlib import Path
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from ..models.schemas import DaisoProduct, DrawerDimension

router = APIRouter(prefix="/api/ai", tags=["AI Recommendation"])

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "daiso_organizers.json"

class AiRecommendRequest(BaseModel):
    purpose: str = Field(..., description="사용자가 입력한 서랍 용도 (예: 재택근무 문구류, 화장대 뷰티용품 등)")
    drawer: Optional[DrawerDimension] = None
    container_count: int = 0

class AiRecommendResponse(BaseModel):
    purpose: str
    rationale: str
    recommended_products: List[DaisoProduct]
    count: int

def load_all_products() -> List[DaisoProduct]:
    if not DATA_PATH.exists():
        return []
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return [DaisoProduct(**item) for item in data]

PURPOSE_KEYWORD_MAP = {
    'cleaning': ['세정제', '수세미', '청소솔', '배수구', '락스', '고무장갑', '스펀지', '매직클리너', '물티슈', '곰팡이', '크리너', '변기솔'],
    'desk': ['볼펜', '형광펜', '메모', '점착', '포스트잇', '수정테이프', '가위', '스테이플러', '자', '클립', '지우개', '샤프', '네임펜', '마스킹테이프'],
    'beauty': ['립스틱', '틴트', '브러시', '아이라이너', '마스카라', '팩트', '쿠션', '뷰러', '면봉', '화장솜', '네일', '섀도우', '미스트'],
    'bath': ['칫솔', '치약', '치실', '면도기', '폼클렌징', '비누', '로션', '샤워캡', '헤어밴드', '가글'],
    'digital': ['케이블', '충전기', '어댑터', '보조배터리', '케이블타이', '드라이버', '건전지', '배터리', '거치대', '이어폰', '젠더'],
    'kitchen': ['커피', '티백', '수저', '포크', '스푼', '오프너', '집게', '계량', '빨대', '이쑤시개', '밀봉'],
    'camping': ['캠핑', '랜턴', '토치', '스토브', '양념통', '카라비너', '스트링', '팩', '로프', '코펠', '반합'],
    'pet': ['간식', '사료', '배변', '장난감', '발톱', '브러쉬', '목줄', '물병', '패드', '하네스'],
    'medical': ['밴드', '소독', '연고', '반창고', '파스', '체온계', '면봉', '알약', '비타민', '영양제', '인공눈물'],
    'hobby': ['색연필', '칼', '딱풀', '본드', '줄자', '니퍼', '핀셋', '테이프', '클립', '스티커']
}

DOMAIN_ALLOWED_CATEGORIES = {
    'cleaning': {'bath_cleaning'},
    'bath': {'bath_body'},
    'beauty': {'beauty'},
    'desk': {'stationery'},
    'digital': {'digital_tools'},
    'kitchen': {'kitchen_food'},
    'camping': {'pet_hobby', 'kitchen_food', 'digital_tools'},
    'pet': {'pet_hobby'},
    'medical': {'bath_body', 'living_fashion', 'beauty'},
    'hobby': {'stationery', 'pet_hobby'}
}

EXCLUDE_CONTAINER_WORDS = [
    '정리함', '수납함', '트레이', '바구니', '수납박스', '서랍', '오거나이저', '깔개', '매트',
    '시트', '선반', '거치대', '꽂이', '홀더', '걸이', '고리', '행거', '디스펜서', '케이스',
    '상자', '박스', '받침', '양면테이프', '팬츠', '바지', '의류', '양말', '속옷', '티셔츠', '피규어'
]

@router.post("/recommend", response_model=AiRecommendResponse)
def recommend_products_for_purpose(req: AiRecommendRequest):
    purpose_text = req.purpose.lower().strip()
    all_prods = load_all_products()

    # 1. Detect category domain first (order matters: cleaning/bath must be checked before beauty!)
    matched_domain = 'desk'
    if any(k in purpose_text for k in ['화장실', '청소', '세정', '락스', '수세미', '배수구', '변기', '물때', '곰팡이', '크리너', '스퀴지']):
        matched_domain = 'cleaning'
    elif any(k in purpose_text for k in ['욕실', '세면', '이빨', '양치', '칫솔', '치약', '면도', '샤워']):
        matched_domain = 'bath'
    elif any(k in purpose_text for k in ['화장품', '화장대', '뷰티', '코스메틱', '메이크업', '립스틱', '틴트', '아이라이너', '마스카라', '파우더', '브러시', '쿠션', '팩트']):
        matched_domain = 'beauty'
    elif any(k in purpose_text for k in ['캠핑', '차박', '야외', '바베큐', '텐트']):
        matched_domain = 'camping'
    elif any(k in purpose_text for k in ['반려동물', '강아지', '고양이', '애견', '애묘', '펫']):
        matched_domain = 'pet'
    elif any(k in purpose_text for k in ['전자기기', 'it', '컴퓨터', '충전', '케이블', '공구', '기계', '배터리', '건전지']):
        matched_domain = 'digital'
    elif any(k in purpose_text for k in ['주방', '부엌', '홈카페', '커피', '티', '차', '스낵', '음식', '식품', '수저', '냉장고', '김치']):
        matched_domain = 'kitchen'
    elif any(k in purpose_text for k in ['약', '비상약', '영양제', '건강', '의료', '치료', '병원', '밴드']):
        matched_domain = 'medical'
    elif any(k in purpose_text for k in ['취미', '미술', '그림', '만들기', '공예', '레고', '아이']):
        matched_domain = 'hobby'

    allowed_cats = DOMAIN_ALLOWED_CATEGORIES.get(matched_domain, {'stationery'})

    # 2. Hard-lock category & exclude organizers, holders, mats, and apparel
    non_organizers = [
        p for p in all_prods
        if p.category in allowed_cats
        and not any(k in p.name for k in EXCLUDE_CONTAINER_WORDS)
        and 1.5 <= p.width <= 25 and 1.5 <= p.depth <= 25
    ]
    # Prioritize verified official specs first, then in-stock items
    non_organizers.sort(key=lambda p: (1 if p.dim_source == 'inferred' else 0, 1 if p.is_sold_out else 0))

    selected_products: List[DaisoProduct] = []
    seen_names = set()

    # 3. Direct user keyword extraction within hard-locked category
    stop_words = {'화장실', '욕실', '청소', '청소용품', '정리', '서랍', '수납', '보관', '추천', '용품', '다이소', '물품', '도구', '상자', '박스', '칸막이', '하고', '위한', '좋은'}
    raw_tokens = [t for t in re.split(r'[\s,./+&~!?]+', purpose_text) if len(t) >= 2 and t not in stop_words]
    for token in raw_tokens:
        matches = [p for p in non_organizers if token in p.name and p.name not in seen_names]
        if matches:
            selected_products.append(matches[0])
            seen_names.add(matches[0].name)
            if len(selected_products) >= 4:
                break

    keywords = PURPOSE_KEYWORD_MAP.get(matched_domain, PURPOSE_KEYWORD_MAP['desk'])

    # 3. Fill remaining slots with domain keywords (up to 10 distinct items)
    for kw in keywords:
        candidates = [
            p for p in non_organizers
            if kw in p.name and p.name not in seen_names
        ]
        if candidates:
            selected_products.append(candidates[0])
            seen_names.add(candidates[0].name)
            if len(selected_products) >= 10:
                break

    # If fewer than 6, fill with general category items
    if len(selected_products) < 6:
        for p in non_organizers:
            if p.name not in seen_names and any(k in p.name for k in keywords):
                selected_products.append(p)
                seen_names.add(p.name)
                if len(selected_products) >= 8:
                    break

    domain_korean_names = {
        'cleaning': '화장실 욕실 및 청소용품',
        'desk': '데스크 & 문구/사무용품',
        'beauty': '화장대 & 뷰티/메이크업',
        'bath': '욕실 & 세면/위생용품',
        'digital': 'IT 전자기기 & 케이블/공구',
        'kitchen': '홈카페 & 주방 소품',
        'camping': '캠핑 & 아웃도어 소품',
        'pet': '반려동물 케어 용품',
        'medical': '비상약 & 건강 관리용품',
        'hobby': '취미 & 만들기/미술용품'
    }

    domain_label = domain_korean_names.get(matched_domain, '맞춤 일상 소품')
    rationale = f"'{req.purpose}' 용도에 최적화된 [{domain_label}] 테마에서 크기와 용도가 서로 다른 {len(selected_products)}가지 실용적인 다이소 소품을 엄선했습니다."

    return AiRecommendResponse(
        purpose=req.purpose,
        rationale=rationale,
        recommended_products=selected_products,
        count=len(selected_products)
    )


class ExternalLlmRequest(BaseModel):
    endpoint_url: str = Field(..., description="API LLM 엔드포인트 URL")
    api_key: Optional[str] = Field("", description="API Key (선택)")
    model: str = Field("gpt-4o-mini", description="호출할 모델 ID")
    purpose: str = Field("", description="사용자 서랍 정리 목적")
    candidates: List[str] = Field(default_factory=list, description="후보 상품명 리스트")


def _normalize_llm_endpoint(raw_url: str, model: str, api_key: str) -> tuple[str, str]:
    """
    Normalizes user-entered endpoint URLs and detects provider format:
    Returns (resolved_url, provider_type: 'gemini' | 'anthropic' | 'ollama_native' | 'openai')
    """
    url = raw_url.strip().rstrip("/")
    lower = url.lower()

    # 1. Google Gemini REST API
    if "generativelanguage.googleapis.com" in lower:
        if ":generatecontent" not in lower:
            m_name = model.strip() or "gemini-2.0-flash"
            if not m_name.startswith("models/"):
                m_name = f"models/{m_name}"
            if "/v1beta" in lower or "/v1" in lower:
                base = re.sub(r'/models/.*$', '', url)
                url = f"{base}/{m_name}:generateContent"
            else:
                url = f"{url}/v1beta/{m_name}:generateContent"
        if api_key and "key=" not in url:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}key={api_key.strip()}"
        return url, "gemini"

    # 2. Anthropic Messages API
    if "anthropic.com" in lower or lower.endswith("/v1/messages"):
        if not lower.endswith("/messages"):
            url = f"{url}/v1/messages" if not lower.endswith("/v1") else f"{url}/messages"
        return url, "anthropic"

    # 3. Ollama Native (/api/chat or /api/generate)
    if lower.endswith("/api/chat") or lower.endswith("/api/generate"):
        return url, "ollama_native"

    # 4. OpenAI-compatible (/v1/chat/completions)
    if not lower.endswith("/chat/completions") and not lower.endswith("/completions"):
        if lower.endswith("/v1") or lower.endswith("/openai/v1") or lower.endswith("/api/v1"):
            url = f"{url}/chat/completions"
        else:
            url = f"{url}/v1/chat/completions"
    return url, "openai"


async def _invoke_external_llm(
    endpoint_url: str,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 250
) -> str:
    resolved_url, provider = _normalize_llm_endpoint(endpoint_url, model, api_key)
    headers: Dict[str, str] = {"Content-Type": "application/json"}
    clean_key = (api_key or "").strip()

    if provider == "gemini":
        payload: Dict[str, Any] = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": max_tokens}
        }
    elif provider == "anthropic":
        if clean_key:
            headers["x-api-key"] = clean_key
        headers["anthropic-version"] = "2023-06-01"
        payload = {
            "model": model.strip() or "claude-3-5-haiku-latest",
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "max_tokens": max_tokens,
            "temperature": 0.2
        }
    elif provider == "ollama_native":
        if resolved_url.lower().endswith("/api/generate"):
            payload = {
                "model": model.strip() or "llama3.2",
                "prompt": f"{system_prompt}\n\n{user_prompt}",
                "stream": False
            }
        else:
            payload = {
                "model": model.strip() or "llama3.2",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "stream": False
            }
    else:
        if clean_key:
            headers["Authorization"] = f"Bearer {clean_key}"
        payload = {
            "model": model.strip() or "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2,
            "max_tokens": max_tokens
        }

    async with httpx.AsyncClient(timeout=18.0) as client:
        resp = await client.post(resolved_url, headers=headers, json=payload)
        if resp.status_code >= 400:
            err_body = resp.text[:300]
            raise HTTPException(
                status_code=400,
                detail=f"LLM 엔드포인트 응답 오류 (HTTP {resp.status_code}): {err_body}"
            )
        data = resp.json()

    if provider == "gemini":
        candidates = data.get("candidates") or []
        if candidates:
            parts = (candidates[0].get("content") or {}).get("parts") or []
            if parts:
                return str(parts[0].get("text", "")).strip()
        return str(data)
    elif provider == "anthropic":
        content_blocks = data.get("content") or []
        if content_blocks and isinstance(content_blocks, list):
            return str(content_blocks[0].get("text", "")).strip()
        return str(data)
    elif provider == "ollama_native":
        if "message" in data and isinstance(data["message"], dict):
            return str(data["message"].get("content", "")).strip()
        return str(data.get("response", "")).strip()
    else:
        choices = data.get("choices") or []
        if choices:
            msg = choices[0].get("message") or {}
            return str(msg.get("content") or choices[0].get("text") or "").strip()
        return str(data)


@router.post("/llm-test")
async def test_external_llm(req: ExternalLlmRequest):
    if not req.endpoint_url.strip():
        raise HTTPException(status_code=400, detail="엔드포인트 URL을 입력해주세요.")
    t0 = time.time()
    try:
        resolved_url, provider = _normalize_llm_endpoint(req.endpoint_url, req.model, req.api_key or "")
        reply = await _invoke_external_llm(
            endpoint_url=req.endpoint_url,
            api_key=req.api_key or "",
            model=req.model,
            system_prompt="You are a helpful assistant.",
            user_prompt="Reply with 'OK' in one short word.",
            max_tokens=20
        )
        latency_ms = int((time.time() - t0) * 1000)
        return {
            "ok": True,
            "provider": provider,
            "resolved_url": resolved_url,
            "model": req.model,
            "latency_ms": latency_ms,
            "reply_preview": reply[:80]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"엔드포인트 연결 실패: {str(e)}")


@router.post("/llm-select")
async def select_candidates_via_external_llm(req: ExternalLlmRequest):
    if not req.endpoint_url.strip():
        raise HTTPException(status_code=400, detail="엔드포인트 URL을 입력해주세요.")
    if not req.candidates:
        return {"selected_indices": [], "rationale": "", "latency_ms": 0}

    numbered = "\n".join(f"[{i + 1}] {name}" for i, name in enumerate(req.candidates))
    system_prompt = (
        "당신은 다이소 수납/정리 전문 AI 큐레이터입니다. "
        "사용자의 서랍/수납 목적에 가장 잘 어울리는 서로 다른 실물 상품 번호 8~10개를 아래 후보 목록에서 골라주세요. "
        "반드시 첫 줄에는 선택한 번호만 쉼표로 구분하여 출력하고(예: 1, 3, 5, 7, 9, 11, 13, 15), "
        "두 번째 줄에는 한국어로 1문장 추천 이유를 작성하세요."
    )
    user_prompt = (
        f"사용자 서랍 용도: \"{req.purpose}\"\n\n"
        f"[다이소 실제 상품 후보 목록]\n{numbered}\n\n"
        "출력 형식:\n"
        "1줄: 선택 번호 (예: 1, 2, 4, 6, 8, 10, 12, 14)\n"
        "2줄: 한국어 추천 요약 1문장"
    )

    t0 = time.time()
    try:
        raw_reply = await _invoke_external_llm(
            endpoint_url=req.endpoint_url,
            api_key=req.api_key or "",
            model=req.model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=220
        )
        latency_ms = int((time.time() - t0) * 1000)

        lines = [l.strip() for l in raw_reply.split("\n") if l.strip()]
        first_line = lines[0] if lines else raw_reply
        num_matches = re.findall(r'\b([0-9]{1,2})\b', first_line)
        if len(num_matches) < 4:
            num_matches = re.findall(r'\b([0-9]{1,2})\b', raw_reply)

        chosen_indices: List[int] = []
        seen = set()
        for m in num_matches:
            idx = int(m) - 1
            if 0 <= idx < len(req.candidates) and idx not in seen:
                chosen_indices.append(idx)
                seen.add(idx)
            if len(chosen_indices) >= 10:
                break

        rationale_line = ""
        for l in lines[1:]:
            cleaned = re.sub(r'^(?:2줄|추천\s*이유|추천\s*요약|이유)\s*[:\-]\s*', '', l).strip()
            if len(cleaned) >= 10 and not re.match(r'^[0-9,\s\[\]]+$', cleaned):
                rationale_line = cleaned
                break

        return {
            "selected_indices": chosen_indices,
            "rationale": rationale_line,
            "raw_reply": raw_reply,
            "latency_ms": latency_ms
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"API LLM 호출 실패: {str(e)}")

