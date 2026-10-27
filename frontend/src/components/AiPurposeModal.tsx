import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  BookOpen,
  Lock,
  ShieldAlert,
  HelpCircle,
  Globe,
  KeyRound,
  Cpu,
  Eye,
  EyeOff,
  PlugZap
} from 'lucide-react';
import { DaisoProduct } from '../data/daisoProducts';
import { BACKEND_URL } from '../config';
import {
  ChromeAiStatus,
  checkChromeGeminiStatus,
  selectCandidatesWithGeminiNano,
  ApiLlmConfig,
  API_LLM_PRESETS,
  loadApiLlmConfig,
  saveApiLlmConfig,
  testApiLlmConnection,
  selectCandidatesWithApiLlm
} from '../utils/chromeAi';
import { ChromeAiGuideModal } from './ChromeAiGuideModal';
import { normalizeProduct } from '../utils/normalizeProduct';

const EXCLUDE_CONTAINER_NAME_REGEX =
  /정리함|수납함|트레이|바구니|수납박스|서랍|오거나이저|깔개|매트|시트|선반|거치대|꽂이|홀더|걸이|고리|행거|디스펜서|케이스|상자|박스|받침|양면테이프|팬츠|바지|의류|양말|속옷|슬리퍼|우산|쇼핑백|포장|리필용기|공병|피규어/;

const ORGANIZER_CATEGORIES = new Set([
  'storage',
  'tray',
  'basket',
  'divider',
  'stackable',
  'storage_box'
]);

interface DomainProfile {
  id: string;
  label: string;
  trigger: RegExp;
  allowedCategories: Set<string>;
  excludeWords?: RegExp;
  buckets: string[][];
}

const DOMAIN_PROFILES: DomainProfile[] = [
  {
    id: 'cleaning',
    label: '화장실/욕실 청소용품',
    trigger: /화장실|청소|세정|락스|수세미|배수구|변기|물때|곰팡이|스퀴지|클리너|세제|솔/,
    allowedCategories: new Set(['bath_cleaning']),
    buckets: [
      ['욕실용 세정제', '욕실 물때 세정제', '다목적 세정제'],
      ['폼타입 락스', '락스'],
      ['배수구 클리너', '배수관 클리너'],
      ['찌든 때 클리너', '석회 강력 제거제', '곰팡이'],
      ['변기세정제', '변기 세정제'],
      ['욕조용 걸이형 청소솔', '미니청소솔', '청소솔'],
      ['욕실 청소 스펀지', '물기 제거 스펀지'],
      ['건조 수세미', '코코넛 수세미', '장갑 수세미'],
      ['고무장갑'],
      ['스퀴지'],
      ['틈새 솔', '바닥 솔']
    ]
  },
  {
    id: 'bath',
    label: '욕실/세면 위생용품',
    trigger: /욕실|세면|치약|칫솔|면도|치실|가글|비누|샴푸|바디워시|클렌징|양치/,
    allowedCategories: new Set(['bath_body']),
    excludeWords: /발각질|강아지|애견/,
    buckets: [
      ['미세모 칫솔', '칫솔'],
      ['치약'],
      ['치실', '치간칫솔'],
      ['구강청결제', '가글'],
      ['3중날 면도기', '면도기'],
      ['클렌징 폼', '폼클렌징'],
      ['바디워시'],
      ['샴푸', '트리트먼트'],
      ['핸드워시', '세안 비누', '비누'],
      ['샤워 타월', '세안타월']
    ]
  },
  {
    id: 'beauty',
    label: '화장대/뷰티 메이크업',
    trigger: /화장대|화장품|뷰티|메이크업|코스메틱|립스틱|틴트|아이라이너|마스카라|쿠션|팩트|브러시|스킨케어|파우더/,
    allowedCategories: new Set(['beauty']),
    buckets: [
      ['립스틱', '틴트', '립밤'],
      ['쿠션', '팩트'],
      ['아이섀도우', '섀도우'],
      ['아이라이너', '아이브로우'],
      ['마스카라', '뷰러'],
      ['메이크업 브러시'],
      ['화장솜', '면봉'],
      ['수분크림', '토너', '앰플'],
      ['선크림'],
      ['퍼퓸', '네일']
    ]
  },
  {
    id: 'desk',
    label: '데스크/문구 사무용품',
    trigger: /사무|데스크|책상|문구|학용품|필기구|볼펜|형광펜|노트|공부|다이어리/,
    allowedCategories: new Set(['stationery']),
    excludeWords: /주방|원예|미용/,
    buckets: [
      ['3색 초저점도 볼펜', '볼펜'],
      ['형광펜'],
      ['클립 샤프', '샤프', '연필'],
      ['점착메모', '포스트잇'],
      ['수정테이프', '지우개'],
      ['문구 가위', '사무용 가위', '커터칼'],
      ['스테이플러'],
      ['딱풀', '마스킹테이프'],
      ['노트', '수첩'],
      ['네임펜', '클립']
    ]
  },
  {
    id: 'digital',
    label: 'IT/전자기기 및 공구',
    trigger: /전자기기|it|케이블|충전|어댑터|보조배터리|공구|건전지|배터리|드라이버/,
    allowedCategories: new Set(['digital_tools']),
    buckets: [
      ['C타입 케이블', '충전 케이블', '케이블'],
      ['고속 충전기', '충전기', '어댑터'],
      ['보조배터리'],
      ['알카라인 건전지', '건전지'],
      ['케이블타이', '벨크로 타이'],
      ['드라이버'],
      ['줄자'],
      ['멀티탭'],
      ['순간접착제', '절연테이프'],
      ['이어폰', '젠더']
    ]
  },
  {
    id: 'kitchen',
    label: '홈카페/주방 및 팬트리 소품',
    trigger: /주방|부엌|홈카페|커피|티백|차|스낵|음료|식기|수저|양념|냉장고|김치/,
    allowedCategories: new Set(['kitchen_food']),
    excludeWords: /세정제|클리너|락스|고무장갑/,
    buckets: [
      ['커피', '드립백', '캡슐'],
      ['티백', '녹차', '홍차'],
      ['스푼', '티스푼', '포크'],
      ['수저', '젓가락'],
      ['양념', '참소스', '소스'],
      ['오프너', '병따개'],
      ['밀봉클립', '실리콘 뚜껑'],
      ['빨대', '머들러'],
      ['종이호일', '크린랩'],
      ['지퍼백']
    ]
  },
  {
    id: 'medical',
    label: '가정용 비상약/위생 구급함',
    trigger: /약|비상약|상비약|영양제|비타민|구급|밴드|소독|연고|체온계|건강/,
    allowedCategories: new Set(['bath_body', 'living_fashion', 'beauty']),
    buckets: [
      ['밴드', '반창고'],
      ['면봉', '알코올 스왑'],
      ['소독', '과산화수소'],
      ['파스', '찜질팩'],
      ['체온계'],
      ['손톱깎이', '핀셋'],
      ['비타민', '영양제'],
      ['안대', '귀마개'],
      ['마스크'],
      ['구강청결제']
    ]
  },
  {
    id: 'pet',
    label: '반려동물 간식/케어 용품',
    trigger: /반려동물|강아지|고양이|애견|애묘|펫|츄르|사료/,
    allowedCategories: new Set(['pet_hobby']),
    buckets: [
      ['강아지 간식', '애견 간식'],
      ['고양이 간식', '츄르'],
      ['강아지 장난감', '공', '로프'],
      ['고양이 장난감', '낚싯대'],
      ['브러쉬', '빗'],
      ['배변봉투', '배변패드'],
      ['발톱깎이'],
      ['산책', '목줄', '하네스'],
      ['급수기', '물병'],
      ['치석제거', '덴탈껌']
    ]
  }
];

function buildGroundedCandidatePool(purposeText: string, allProducts: DaisoProduct[]) {
  const lower = purposeText.toLowerCase();
  const domain =
    DOMAIN_PROFILES.find(d => d.trigger.test(lower)) || DOMAIN_PROFILES[3]; // default desk

  // 1. Hard-lock category & filter out containers/holders/fixtures
  const validPool = allProducts.filter(p => {
    if (ORGANIZER_CATEGORIES.has(p.category)) return false;
    if (!domain.allowedCategories.has(p.category)) return false;
    if (EXCLUDE_CONTAINER_NAME_REGEX.test(p.name)) return false;
    if (domain.excludeWords && domain.excludeWords.test(p.name)) return false;
    return p.width >= 1.5 && p.width <= 25 && p.depth >= 1.5 && p.depth <= 25;
  });

  // Prioritize verified official specs first, then in-stock items
  validPool.sort((a, b) => {
    const aInf = a.dimSource === 'inferred' ? 1 : 0;
    const bInf = b.dimSource === 'inferred' ? 1 : 0;
    if (aInf !== bInf) return aInf - bInf;
    return (a.isSoldOut ? 1 : 0) - (b.isSoldOut ? 1 : 0);
  });

  const primaryPerBucket: DaisoProduct[] = [];
  const secondaryPerBucket: DaisoProduct[] = [];
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();

  // 2. Check if user explicitly typed specific item nouns in their prompt
  const stopWords = new Set(['화장실', '욕실', '청소', '청소용품', '세면도구', '화장대', '뷰티', '책상', '서랍', '정리', '보관', '수납', '용품', '도구', '소품', '추천', '다이소']);
  const userTokens = lower
    .split(/[\s,./+&~!?]+/)
    .map(t => t.replace(/에|을|를|이|가|와|과|랑|하고|용/g, '').trim())
    .filter(t => t.length >= 2 && !stopWords.has(t));

  for (const token of userTokens) {
    const directMatch = validPool.find(p => p.name.includes(token) && !usedIds.has(p.id) && !usedNames.has(p.name));
    if (directMatch) {
      primaryPerBucket.push(normalizeProduct(directMatch));
      usedIds.add(directMatch.id);
      usedNames.add(directMatch.name);
    }
  }

  // 3. Collect 1st and 2nd best candidates from each functional bucket in the domain
  for (const bucket of domain.buckets) {
    let foundFirst = false;
    for (const kw of bucket) {
      const matches = validPool.filter(p => p.name.includes(kw) && !usedIds.has(p.id) && !usedNames.has(p.name));
      for (const m of matches) {
        if (!foundFirst) {
          primaryPerBucket.push(normalizeProduct(m));
          usedIds.add(m.id);
          usedNames.add(m.name);
          foundFirst = true;
        } else if (secondaryPerBucket.length < 12) {
          secondaryPerBucket.push(normalizeProduct(m));
          usedIds.add(m.id);
          usedNames.add(m.name);
          break;
        }
      }
      if (foundFirst) break;
    }
  }

  const candidatePool = [...primaryPerBucket, ...secondaryPerBucket].slice(0, 22);
  return {
    domainLabel: domain.label,
    candidates: candidatePool,
    primaryPerBucket
  };
}

interface AiPurposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAiGoods: (recommendedProducts: DaisoProduct[], rationale?: string) => void;
  allProducts: DaisoProduct[];
  allowHeightExceed?: boolean;
  onToggleAllowHeightExceed?: () => void;
}

const PURPOSE_PRESETS = [
  {
    id: 'cleaning',
    label: '화장실 / 청소용품',
    icon: HelpCircle,
    desc: '다목적 세정제, 락스, 청소솔, 수세미, 배수구 클리너, 고무장갑',
    prompt: '화장실 욕실 청소 세제와 청소도구 정리'
  },
  {
    id: 'desk',
    label: '사무 / 데스크',
    icon: HelpCircle,
    desc: '볼펜, 형광펜, 포스트잇, 수정테이프, 스테이플러',
    prompt: '재택근무용 책상 서랍 문구류 및 필기구 정리'
  },
  {
    id: 'beauty',
    label: '화장대 / 뷰티',
    icon: HelpCircle,
    desc: '립스틱, 팩트, 아이라이너, 브러시, 뷰러, 면봉',
    prompt: '화장대 서랍 속 매일 쓰는 화장품과 뷰티 소품 정리'
  },
  {
    id: 'bath',
    label: '욕실 / 세면도구',
    icon: HelpCircle,
    desc: '칫솔, 치약, 치실, 면도기, 폼클렌징, 바디로션',
    prompt: '욕실 슬라이딩 수납장 세면 위생도구 정리'
  },
  {
    id: 'digital',
    label: 'IT / 전자기기·공구',
    icon: HelpCircle,
    desc: '충전케이블, 어댑터, 보조배터리, 드라이버, 케이블타이',
    prompt: '전자기기 충전 케이블과 보조배터리, 소형 공구 보관'
  },
  {
    id: 'kitchen',
    label: '홈카페 / 주방 소품',
    icon: HelpCircle,
    desc: '커피캡슐, 티백, 디저트스푼, 오프너, 밀봉클립',
    prompt: '홈카페 티백, 커피 캡슐, 디저트 커트러리 주방 소품'
  },
  {
    id: 'medical',
    label: '비상약 / 영양제',
    icon: HelpCircle,
    desc: '대일밴드, 소독약, 연고, 진통제, 비타민, 체온계',
    prompt: '가정용 비상 상비약과 비타민 영양제 정리'
  }
];

export const AiPurposeModal: React.FC<AiPurposeModalProps> = ({
  isOpen,
  onClose,
  onApplyAiGoods,
  allProducts,
  allowHeightExceed = false,
  onToggleAllowHeightExceed
}) => {
  const [purposeInput, setPurposeInput] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chromeAiStatus, setChromeAiStatus] = useState<ChromeAiStatus | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  // API LLM Endpoint Configuration State
  const [apiConfig, setApiConfig] = useState<ApiLlmConfig>(() => loadApiLlmConfig());
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isTestingApi, setIsTestingApi] = useState<boolean>(false);
  const [apiTestStatus, setApiTestStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [aiResult, setAiResult] = useState<{
    rationale: string;
    products: DaisoProduct[];
    source: 'chrome_gemini' | 'api_llm' | 'backend_ai' | 'smart_matcher';
    modelLabel?: string;
  } | null>(null);

  // Check Chrome Gemini Status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkChromeGeminiStatus().then(status => {
        setChromeAiStatus(status);
      });
    }
  }, [isOpen]);

  const updateApiConfig = (patch: Partial<ApiLlmConfig>) => {
    setApiConfig(prev => {
      const next = { ...prev, ...patch };
      saveApiLlmConfig(next);
      return next;
    });
    setApiTestStatus(null);
    setErrorMessage(null);
  };

  const handleSelectApiPreset = (presetId: string) => {
    const found = API_LLM_PRESETS.find(p => p.id === presetId);
    if (!found) return;
    updateApiConfig({
      presetId: found.id,
      endpointUrl: found.id === 'custom' ? apiConfig.endpointUrl : found.endpointUrl,
      model: found.id === 'custom' ? apiConfig.model : found.defaultModel
    });
  };

  const handleTestEndpoint = async () => {
    setIsTestingApi(true);
    setApiTestStatus(null);
    const res = await testApiLlmConnection(BACKEND_URL, apiConfig);
    setApiTestStatus(res);
    setIsTestingApi(false);
  };

  if (!isOpen) return null;

  const isChromeAiAvailable = chromeAiStatus?.availability === 'available';
  const isApiMode = apiConfig.enabled;
  const isApiEndpointReady = isApiMode && apiConfig.endpointUrl.trim().length > 0;
  const canRequestAi = isApiMode ? isApiEndpointReady : isChromeAiAvailable;

  const handleSelectPreset = (preset: typeof PURPOSE_PRESETS[0]) => {
    setSelectedPresetId(preset.id);
    setPurposeInput(preset.prompt);
  };

  const handleRequestAiRecommendation = async () => {
    const text = purposeInput.trim();
    if (!text) {
      alert('정리하고자 하는 서랍의 용도나 보관 물품을 입력해주세요!');
      return;
    }

    setIsLoading(true);
    setAiResult(null);
    setErrorMessage(null);

    // Stage 1: Category Hard-Locked RAG Candidate Retrieval (20~22 verified Daiso products)
    const { domainLabel, candidates, primaryPerBucket } = buildGroundedCandidatePool(text, allProducts);

    // Stage 2A: External / Local API LLM Endpoint Mode
    if (isApiMode && candidates.length > 0) {
      try {
        const candidateNames = candidates.map(c => c.name);
        const { selectedIndices, rationale, latencyMs } = await selectCandidatesWithApiLlm(
          BACKEND_URL,
          apiConfig,
          text,
          candidateNames
        );

        const matchedProducts: DaisoProduct[] = [];
        const usedIds = new Set<string>();

        for (const idx of selectedIndices) {
          const item = candidates[idx];
          if (item && !usedIds.has(item.id)) {
            matchedProducts.push(item);
            usedIds.add(item.id);
          }
          if (matchedProducts.length >= 9) break;
        }

        for (const fallbackItem of primaryPerBucket) {
          if (matchedProducts.length >= 9) break;
          if (!usedIds.has(fallbackItem.id)) {
            matchedProducts.push(fallbackItem);
            usedIds.add(fallbackItem.id);
          }
        }

        if (matchedProducts.length >= 4) {
          const modelTag = apiConfig.model.trim() || 'API LLM';
          setAiResult({
            rationale:
              rationale ||
              `API LLM(${modelTag})이 [${domainLabel}] 실제 다이소 후보군에서 '${text}' 목적에 가장 알맞은 ${matchedProducts.length}가지 실물 상품을 엄선했습니다.`,
            products: matchedProducts,
            source: 'api_llm',
            modelLabel: `${modelTag}${latencyMs ? ` · ${latencyMs}ms` : ''}`
          });
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'API LLM 엔드포인트 호출 중 오류가 발생했습니다. 엔드포인트 주소와 API Key/모델명을 확인해주세요.');
        setIsLoading(false);
        return;
      }
    }

    // Stage 2B: Grounded Candidate Selection with Chrome Built-in Gemini Nano (English Instruction Bridge)
    if (!isApiMode && isChromeAiAvailable && candidates.length > 0) {
      try {
        const candidateNames = candidates.map(c => c.name);
        const selectedIndices = await selectCandidatesWithGeminiNano(text, candidateNames);

        const matchedProducts: DaisoProduct[] = [];
        const usedIds = new Set<string>();

        for (const idx of selectedIndices) {
          const item = candidates[idx];
          if (item && !usedIds.has(item.id)) {
            matchedProducts.push(item);
            usedIds.add(item.id);
          }
          if (matchedProducts.length >= 9) break;
        }

        // Fill remaining slots up to 9 items using diverse top bucket items
        for (const fallbackItem of primaryPerBucket) {
          if (matchedProducts.length >= 9) break;
          if (!usedIds.has(fallbackItem.id)) {
            matchedProducts.push(fallbackItem);
            usedIds.add(fallbackItem.id);
          }
        }

        if (matchedProducts.length >= 4) {
          setAiResult({
            rationale: `Chrome 내장 Gemini Nano가 [${domainLabel}] 실제 다이소 후보군에서 '${text}' 목적에 가장 적합한 ${matchedProducts.length}가지 실물 상품을 엄선했습니다.`,
            products: matchedProducts,
            source: 'chrome_gemini'
          });
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Chrome Gemini Nano grounded selection failed, falling back:', err);
      }
    }

    // Stage 3: Query Backend AI Recommendation API
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: text })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.recommended_products && data.recommended_products.length > 0) {
          const mapped = data.recommended_products.map(normalizeProduct);
          setAiResult({
            rationale: data.rationale,
            products: mapped,
            source: 'backend_ai'
          });
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Backend fallback to Category Hard-Locked pool
    }

    // Stage 4: Local Category Hard-Locked Fallback
    const curated = primaryPerBucket.slice(0, 9);
    setAiResult({
      rationale: `'${text}' 용도에 알맞은 [${domainLabel}]에서 크기가 다양하고 실용적인 ${curated.length}가지 서로 다른 다이소 소품을 선별했습니다.`,
      products: curated,
      source: 'smart_matcher'
    });
    setIsLoading(false);
  };

  const handleApplyToDrawer = () => {
    if (!aiResult || aiResult.products.length === 0) return;
    onApplyAiGoods(aiResult.products, aiResult.rationale);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none"
        onClick={onClose}
      >
        <div
          className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-indigo-50 to-white">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h2 className="text-base font-bold text-slate-900">AI 서랍 용도 맞춤 추천</h2>
                  <span className="bg-indigo-100 text-indigo-700 font-bold text-[10px] px-2 py-0.5 rounded-full">
                    {isApiMode ? 'API LLM Endpoint' : 'On-Device AI'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Chrome 내장 Gemini Nano 또는 외부/로컬 API LLM 엔드포인트를 연결해 서랍 맞춤 실물 소품을 추천받으세요.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* Engine Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => updateApiConfig({ enabled: false })}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  !isApiMode
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles size={14} />
                <span>Chrome 내장 Gemini Nano</span>
              </button>
              <button
                type="button"
                onClick={() => updateApiConfig({ enabled: true })}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  isApiMode
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlugZap size={14} />
                <span>외부/로컬 API LLM 엔드포인트</span>
              </button>
            </div>

            {/* Mode 1: Chrome Built-in AI Status Banner */}
            {!isApiMode ? (
              <div className={`p-3.5 rounded-2xl border transition-all ${
                isChromeAiAvailable
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-gradient-to-r from-amber-50 to-rose-50/70 border-amber-200 text-slate-800'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    {isChromeAiAvailable ? (
                      <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <ShieldAlert size={18} className="text-amber-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <strong className="text-xs font-bold">
                          {isChromeAiAvailable
                            ? '✨ Chrome 내장 Gemini Nano 활성화 완료'
                            : '⚠️ Chrome 내장 Gemini Nano 미활성화 (설정 필요)'}
                        </strong>
                      </div>
                      <p className="text-[11px] mt-0.5 leading-relaxed text-slate-600 font-medium">
                        {chromeAiStatus?.message || (isChromeAiAvailable
                          ? '브라우저 내장 온디바이스 AI(Gemini Nano)가 준비되어 외부 서버 전송 없이 즉시 추천이 작동합니다.'
                          : 'Chrome 내장 Gemini가 비활성화되어 있나요? 우측 상단 [외부/로컬 API LLM 엔드포인트] 탭을 누르시면 OpenAI, Gemini API, 로컬 Ollama 등을 바로 연결해 쓸 수 있습니다.')}
                      </p>
                      {chromeAiStatus?.diagnostics && (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono">
                          <span className={`px-2 py-0.5 rounded border ${
                            chromeAiStatus.diagnostics.hasLanguageModel || chromeAiStatus.diagnostics.hasWindowAi
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            API: {chromeAiStatus.diagnostics.detectedNamespace || '미감지'}
                          </span>
                          {chromeAiStatus.diagnostics.rawAvailability && (
                            <span className={`px-2 py-0.5 rounded border ${
                              chromeAiStatus.diagnostics.rawAvailability === 'available' || chromeAiStatus.diagnostics.rawAvailability === 'readily'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              브라우저 보고 상태: {chromeAiStatus.diagnostics.rawAvailability}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Guide Button to open Chrome AI Setup Modal */}
                  {!isChromeAiAvailable && (
                    <button
                      type="button"
                      onClick={() => setIsGuideModalOpen(true)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 shadow-xs active:scale-95 transition-all ml-2"
                    >
                      <BookOpen size={13} />
                      <span>Gemini 켜는 법 (안내 페이지)</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Mode 2: External / Local API LLM Endpoint Configuration Panel */
              <div className="p-4 rounded-2xl bg-slate-50 border border-indigo-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <Globe size={15} className="text-indigo-600" />
                    <strong className="text-xs font-bold text-slate-900">API LLM 엔드포인트 설정</strong>
                    <span className="text-[10px] text-slate-500">(브라우저에 자동 저장됨)</span>
                  </div>
                  <button
                    type="button"
                    disabled={isTestingApi || !apiConfig.endpointUrl.trim()}
                    onClick={handleTestEndpoint}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white transition-colors shadow-2xs"
                  >
                    {isTestingApi ? <Loader2 size={12} className="animate-spin" /> : <PlugZap size={12} />}
                    <span>{isTestingApi ? '연결 확인 중...' : '연결 테스트'}</span>
                  </button>
                </div>

                {/* Provider Quick Preset Chips */}
                <div className="flex flex-wrap gap-1">
                  {API_LLM_PRESETS.map(p => {
                    const active = apiConfig.presetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectApiPreset(p.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          active
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Endpoint URL Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                    <Globe size={12} className="text-slate-400" />
                    <span>엔드포인트 URL (OpenAI 호환 / Gemini / Anthropic / Ollama)</span>
                  </label>
                  <input
                    type="text"
                    value={apiConfig.endpointUrl}
                    onChange={e => updateApiConfig({ endpointUrl: e.target.value, presetId: 'custom' })}
                    placeholder="예: https://api.openai.com/v1/chat/completions 또는 http://localhost:11434/v1/chat/completions"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Model ID & API Key Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                      <Cpu size={12} className="text-slate-400" />
                      <span>모델 ID (Model Name)</span>
                    </label>
                    <input
                      type="text"
                      value={apiConfig.model}
                      onChange={e => updateApiConfig({ model: e.target.value })}
                      placeholder="예: gpt-4o-mini, gemini-2.0-flash, llama3.2"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                      <KeyRound size={12} className="text-slate-400" />
                      <span>API Key (로컬 LLM은 생략 가능)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiConfig.apiKey}
                        onChange={e => updateApiConfig({ apiKey: e.target.value })}
                        placeholder={
                          API_LLM_PRESETS.find(p => p.id === apiConfig.presetId)?.placeholderKey ||
                          'sk-... (선택)'
                        }
                        className="w-full pl-3 pr-8 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(prev => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title={showApiKey ? 'API Key 숨기기' : 'API Key 보기'}
                      >
                        {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Connection Test Result Banner */}
                {apiTestStatus && (
                  <div
                    className={`px-3 py-2 rounded-xl text-[11px] font-medium flex items-center space-x-2 border ${
                      apiTestStatus.ok
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {apiTestStatus.ok ? (
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldAlert size={14} className="text-rose-600 shrink-0" />
                    )}
                    <span className="truncate">{apiTestStatus.message}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="px-3 py-2 rounded-xl text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200 flex items-center space-x-2">
                    <ShieldAlert size={14} className="text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Purpose Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                💡 자주 쓰는 서랍 정리 용도 선택
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PURPOSE_PRESETS.map(preset => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`flex flex-col p-2.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-800">{preset.label}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{preset.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Custom Purpose Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ✍️ 직접 서랍 용도 입력하기
              </label>
              <textarea
                value={purposeInput}
                onChange={e => {
                  setPurposeInput(e.target.value);
                  setSelectedPresetId(null);
                }}
                rows={2}
                placeholder="예: 화장실 청소용품 및 락스 세정제 정리, 또는 초등학생 학용품과 필기구 보관..."
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none shadow-2xs leading-relaxed text-slate-800"
              />
            </div>

            {/* Height Exceed Toggle Option */}
            {onToggleAllowHeightExceed && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs shadow-2xs">
                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowHeightExceed}
                    onChange={onToggleAllowHeightExceed}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="font-bold text-slate-800">채울 때 높이 초과 허용 (키 큰 소품도 채우기)</span>
                </label>
                <span className="text-[11px] font-mono font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {allowHeightExceed ? '🚀 돌출 허용' : '🔒 서랍 닫힘 높이 준수'}
                </span>
              </div>
            )}

            {/* AI Recommend Action Button */}
            <div>
              <button
                type="button"
                disabled={!canRequestAi || isLoading || !purposeInput.trim()}
                onClick={handleRequestAiRecommendation}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98 ${
                  !canRequestAi
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none border border-slate-300'
                    : isLoading || !purposeInput.trim()
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white shadow-indigo-500/25'
                }`}
                title={!canRequestAi ? 'Chrome 내장 Gemini를 켜거나 API LLM 엔드포인트를 입력해주세요.' : ''}
              >
                {!canRequestAi ? (
                  <>
                    <Lock size={15} />
                    <span>
                      {isApiMode
                        ? 'API LLM 엔드포인트 URL을 입력해주세요'
                        : 'Chrome Gemini 활성화 또는 API LLM 탭 선택 필요'}
                    </span>
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>
                      {isApiMode
                        ? `API LLM(${apiConfig.model || 'Model'})이 서랍 맞춤 물품을 분석 중입니다...`
                        : 'Gemini Nano가 서랍 맞춤 물품을 분석 중입니다...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>
                      {isApiMode
                        ? `API LLM(${apiConfig.model || 'Endpoint'}) 맞춤 물품 추천받기`
                        : 'Chrome Gemini 맞춤 물품 추천받기'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* AI Recommendation Result Box */}
            {aiResult && (
              <div className="space-y-3 p-4 bg-slate-50 border border-indigo-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-900">AI 큐레이션 분석 완료</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold">
                        {aiResult.source === 'chrome_gemini'
                          ? 'Gemini Nano On-Device'
                          : aiResult.source === 'api_llm'
                          ? `API LLM (${aiResult.modelLabel || apiConfig.model})`
                          : 'AI Engine'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-medium">
                      {aiResult.rationale}
                    </p>
                  </div>
                </div>

                {/* Recommended Items Preview Grid */}
                <div className="mt-2">
                  <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center justify-between">
                    <span>추천된 {aiResult.products.length}가지 서로 다른 소품 목록 (중복 없음)</span>
                    <span className="text-indigo-600 font-semibold text-[10px]">
                      수납함에 1개씩 골고루 배치됩니다
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {aiResult.products.map((prod, idx) => (
                      <div
                        key={prod.id}
                        className="flex items-center space-x-2.5 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs group hover:border-indigo-300 transition-all"
                      >
                        {/* High Quality Thumbnail Image */}
                        <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500"
                              style={{ backgroundColor: prod.color }}
                            >
                              D
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-800 truncate" title={prod.name}>
                            {idx + 1}. {prod.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center justify-between">
                            <span className="flex items-center space-x-1">
                              <span>{prod.dimSource === 'inferred' ? '~' : ''}{prod.width}×{prod.depth}×{prod.height}cm</span>
                              {prod.dimSource === 'inferred' && (
                                <span className="text-[8px] font-sans font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded">
                                  추정
                                </span>
                              )}
                            </span>
                            <span className="text-indigo-600 font-bold">₩{prod.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Apply Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleApplyToDrawer}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center space-x-1.5 transition-all active:scale-98"
                  >
                    <CheckCircle2 size={16} />
                    <span>이 추천 물품들로 수납함에 담기 (다 다른 물건으로 채우기)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chrome AI Setup Guide Modal */}
      <ChromeAiGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        status={chromeAiStatus}
        onStatusRefresh={(newStatus) => setChromeAiStatus(newStatus)}
      />
    </>
  );
};
