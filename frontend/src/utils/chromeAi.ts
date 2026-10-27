// Chrome Built-in AI (Prompt API / Gemini Nano) Utility & Types

export type ChromeAiAvailability =
  | 'checking'
  | 'available'       // Ready to prompt immediately ('available' or 'readily')
  | 'downloadable'    // Model download needed ('downloadable' or 'after-download')
  | 'unsupported'     // Flags not enabled, API unavailable, or performance check failed
  | 'not_chrome';     // Non-Chrome browser

export interface ChromeAiStatus {
  availability: ChromeAiAvailability;
  isChrome: boolean;
  modelName: string;
  temperature?: number;
  maxTopK?: number;
  message: string;
  diagnostics?: {
    hasLanguageModel: boolean;
    hasWindowAi: boolean;
    detectedNamespace?: string;
    rawAvailability?: string;
  };
}

// Detect if current browser is Google Chrome
export function isChromeBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent;
  const isChromium = /Chrome/.test(userAgent);
  const isEdge = /Edg/.test(userAgent);
  const isOpera = /OPR/.test(userAgent);
  return isChromium && !isEdge && !isOpera;
}

// Get Prompt API Namespace across W3C spec and Chrome versions
export function getLanguageModelAPI(): any {
  if (typeof window === 'undefined') return null;
  const win = window as any;

  // 1. W3C Standard & Chrome 131+: window.LanguageModel
  if (win.LanguageModel && typeof win.LanguageModel === 'function') {
    return win.LanguageModel;
  }

  // 2. Chrome 128~130: window.ai.languageModel
  if (win.ai?.languageModel) {
    return win.ai.languageModel;
  }

  // 3. Early Chrome 127: window.ai.assistant
  if (win.ai?.assistant) {
    return win.ai.assistant;
  }

  return null;
}

// Check Chrome built-in Gemini Nano capabilities & diagnostics
export async function checkChromeGeminiStatus(): Promise<ChromeAiStatus> {
  const isChrome = isChromeBrowser();
  if (!isChrome) {
    return {
      availability: 'not_chrome',
      isChrome: false,
      modelName: 'None',
      message: 'Chrome 내장 Gemini Nano는 Google Chrome 브라우저에서만 지원됩니다.'
    };
  }

  const win = typeof window !== 'undefined' ? (window as any) : {};
  const hasLanguageModel = typeof win.LanguageModel !== 'undefined';
  const hasWindowAi = typeof win.ai !== 'undefined';

  const LM = getLanguageModelAPI();
  if (!LM) {
    return {
      availability: 'unsupported',
      isChrome: true,
      modelName: 'Gemini Nano (미활성화)',
      message: 'Chrome 내장 Prompt API가 브라우저에 활성화되지 않았습니다. chrome://flags 설정이 필요합니다.',
      diagnostics: {
        hasLanguageModel: false,
        hasWindowAi: false
      }
    };
  }

  const detectedNamespace = win.LanguageModel ? 'window.LanguageModel (W3C 표준)' : 'window.ai.languageModel (레거시)';

  // 1. Check using availability() (Chrome 131+ / W3C Prompt API)
  if (typeof LM.availability === 'function') {
    try {
      const avail = await LM.availability();
      if (avail === 'available' || avail === 'readily') {
        return {
          availability: 'available',
          isChrome: true,
          modelName: 'Gemini Nano (On-Device)',
          message: 'Google Gemini Nano가 브라우저에 탑재되어 즉시 작동 가능합니다.',
          diagnostics: {
            hasLanguageModel,
            hasWindowAi,
            detectedNamespace,
            rawAvailability: avail
          }
        };
      } else if (avail === 'downloadable' || avail === 'after-download' || avail === 'downloading') {
        return {
          availability: 'downloadable',
          isChrome: true,
          modelName: 'Gemini Nano (다운로드 대기)',
          message: 'Gemini Nano 모델 다운로드 또는 준비가 필요합니다. chrome://components에서 확인하세요.',
          diagnostics: {
            hasLanguageModel,
            hasWindowAi,
            detectedNamespace,
            rawAvailability: avail
          }
        };
      } else {
        // 'unavailable' or 'no'
        return {
          availability: 'unsupported',
          isChrome: true,
          modelName: 'Gemini Nano (플래그/성능우회 필요)',
          message: 'Prompt API는 감지되었으나, [Enables optimization guide on device: BypassPerfRequirement] 플래그 설정 및 브라우저 재시작(Relaunch)이 필요합니다.',
          diagnostics: {
            hasLanguageModel,
            hasWindowAi,
            detectedNamespace,
            rawAvailability: avail
          }
        };
      }
    } catch (err) {
      console.warn('LM.availability() error:', err);
    }
  }

  // 2. Check using capabilities() (Chrome 128~130)
  if (typeof LM.capabilities === 'function') {
    try {
      const caps = await LM.capabilities();
      const available = caps?.available;

      if (available === 'readily' || available === 'available') {
        return {
          availability: 'available',
          isChrome: true,
          modelName: 'Gemini Nano (On-Device)',
          temperature: caps?.defaultTemperature,
          maxTopK: caps?.maxTopK,
          message: 'Google Gemini Nano가 브라우저에 탑재되어 즉시 작동 가능합니다.',
          diagnostics: {
            hasLanguageModel,
            hasWindowAi,
            detectedNamespace,
            rawAvailability: available
          }
        };
      } else if (available === 'after-download' || available === 'downloadable') {
        return {
          availability: 'downloadable',
          isChrome: true,
          modelName: 'Gemini Nano (다운로드 대기)',
          message: 'Gemini Nano 모델 다운로드가 필요합니다. chrome://components에서 확인하세요.',
          diagnostics: {
            hasLanguageModel,
            hasWindowAi,
            detectedNamespace,
            rawAvailability: available
          }
        };
      } else {
        return {
          availability: 'unsupported',
          isChrome: true,
          modelName: 'Gemini Nano (지원 불가)',
          message: '이 기기에서는 Gemini Nano 온디바이스 모델 실행이 지원되지 않습니다.',
          diagnostics: {
            hasLanguageModel,
            hasWindowAi,
            detectedNamespace,
            rawAvailability: String(available)
          }
        };
      }
    } catch (err) {
      console.warn('LM.capabilities() error:', err);
    }
  }

  // 3. Fallback: LM exists with create()
  if (typeof LM.create === 'function') {
    return {
      availability: 'available',
      isChrome: true,
      modelName: 'Gemini Nano',
      message: 'Google Gemini Nano 세션 생성을 지원합니다.',
      diagnostics: {
        hasLanguageModel,
        hasWindowAi,
        detectedNamespace
      }
    };
  }

  return {
    availability: 'unsupported',
    isChrome: true,
    modelName: 'Gemini Nano (미활성화)',
    message: 'Chrome 내장 Gemini Nano가 비활성화되어 있습니다. chrome://flags 설정이 필요합니다.',
    diagnostics: {
      hasLanguageModel,
      hasWindowAi
    }
  };
}

// Grounded Candidate Selection with Chrome Built-in Gemini Nano (RAG + English System Instruction Bridge)
export async function selectCandidatesWithGeminiNano(
  purpose: string,
  candidateNames: string[]
): Promise<number[]> {
  const LM = getLanguageModelAPI();
  if (!LM || typeof LM.create !== 'function' || candidateNames.length === 0) {
    return [];
  }

  const numberedList = candidateNames
    .map((name, idx) => `[${idx + 1}] ${name}`)
    .join('\n');

  // English instruction bridge: Gemini Nano is officially tuned on English instructions
  const englishSystemInstruction =
    'You are an intelligent product curator for Daiso Korea. ' +
    'Select the 8 to 10 best matching item numbers from the provided Candidate List for the user purpose. ' +
    'Output ONLY the item numbers separated by commas (e.g., 1, 3, 5, 7, 9, 11, 13, 15). Do not invent items.';

  const selectionPrompt = `Task: Select 8 to 10 distinct items from the Candidate List below that best fit the User Purpose.
User Purpose: "${purpose}"

Candidate List:
${numberedList}

Output ONLY the selected numbers separated by commas (example: 1, 2, 4, 6, 8, 10, 12, 14):`;

  let session: any;
  try {
    session = await LM.create({
      initialPrompts: [{ role: 'system', content: englishSystemInstruction }],
      systemPrompt: englishSystemInstruction,
      temperature: 0.1,
      topK: 3
    });
  } catch {
    session = await LM.create();
  }

  try {
    const rawResponse = await session.prompt(selectionPrompt);
    const chosenIndices: number[] = [];
    const seen = new Set<number>();

    // 1. Parse all numbers [1..N] returned by Gemini Nano
    const numMatches = rawResponse.match(/\b([0-9]{1,2})\b/g) || [];
    for (const m of numMatches) {
      const idx = parseInt(m, 10) - 1;
      if (idx >= 0 && idx < candidateNames.length && !seen.has(idx)) {
        chosenIndices.push(idx);
        seen.add(idx);
      }
      if (chosenIndices.length >= 10) break;
    }

    // 2. Also check if Gemini echoed candidate names directly
    if (chosenIndices.length < 6) {
      candidateNames.forEach((cName, idx) => {
        if (!seen.has(idx) && chosenIndices.length < 10) {
          const shortToken = cName.split(/\s+/).slice(0, 2).join(' ');
          if (shortToken.length >= 3 && rawResponse.includes(shortToken)) {
            chosenIndices.push(idx);
            seen.add(idx);
          }
        }
      });
    }

    return chosenIndices;
  } finally {
    if (session && typeof session.destroy === 'function') {
      try {
        session.destroy();
      } catch {
        // Ignore destroy error
      }
    }
  }
}

// Prompt Chrome Built-in Gemini Nano model
export async function promptChromeGeminiNano(
  purpose: string,
  options?: { systemPrompt?: string }
): Promise<string> {
  const LM = getLanguageModelAPI();
  if (!LM || typeof LM.create !== 'function') {
    throw new Error('Chrome Gemini Prompt API가 브라우저에서 실행되지 않습니다.');
  }

  const defaultSystemPrompt = `당신은 다이소 매장 전문 정리 정돈 컨설턴트 AI입니다.
사용자가 정리하려는 서랍 또는 수납함의 용도/목적에 맞추어, 수납함 안에 보관할 실제 내용물(다이소 소품/소모품/도구) 품목명 10개를 추천하세요.
주의사항:
1. 수납함, 바구니, 선반, 양면테이프, 고리 같은 설치/수납 도구가 아니라 그 안에 담을 '실제 물품'을 추천하세요.
2. 옷, 의류, 바지, 양말, 화장품 앰플(청소 목적인 경우) 등 목적과 무관한 상품은 절대 추천하지 마세요.
3. 마크다운 별표(*)나 부연 설명(:) 없이 오직 번호와 짧은 품목명(2~8자)만 한 줄에 하나씩 출력하세요.`;

  const fullUserPrompt = `[지시사항]
사용자의 서랍/수납 목적에 맞는 다이소 실제 보관 물품(내용물) 이름을 10개 출력하세요.
마크다운 기호(*, -, **)나 부연 설명(:)을 절대 쓰지 말고, 아래 예시처럼 번호와 짧은 명사형 품목명만 출력하세요.

예시 (화장실 청소용품 보관인 경우):
1. 다목적 세정제
2. 욕실 청소솔
3. 락스
4. 배수구 클리너
5. 실리콘 수세미
6. 고무장갑
7. 매직블럭 스펀지
8. 변기 세정제
9. 곰팡이 제거제
10. 욕실 스퀴지

사용자 입력 목적: ${purpose}
추천 품목 목록:`;

  const systemContent = options?.systemPrompt || defaultSystemPrompt;
  let session: any;

  try {
    // W3C Standard (Chrome 131+ / 155): uses initialPrompts
    session = await LM.create({
      initialPrompts: [{ role: 'system', content: systemContent }],
      systemPrompt: systemContent,
      temperature: 0.2,
      topK: 3
    });
  } catch {
    // Fallback if browser rejects initialPrompts or custom params
    session = await LM.create();
  }

  try {
    const responseText = await session.prompt(fullUserPrompt);
    return responseText;
  } finally {
    if (session && typeof session.destroy === 'function') {
      try {
        session.destroy();
      } catch {
        // Ignore destroy error
      }
    }
  }
}

// Chrome Gemini Nano Setup Guide Steps
export interface ChromeSetupStep {
  step: number;
  title: string;
  description: string;
  urlToCopy?: string;
  settingName?: string;
  settingValue?: string;
  tip?: string;
}

export const CHROME_AI_SETUP_STEPS: ChromeSetupStep[] = [
  {
    step: 1,
    title: 'Chrome 브라우저 버전 확인',
    description: 'Chrome 브라우저가 최신 버전(128 이상, 64-bit 권장)인지 확인합니다. 설정 > Chrome 정보에서 업데이트할 수 있습니다.'
  },
  {
    step: 2,
    title: 'Prompt API 플래그 활성화',
    description: '주소창에 아래 주소를 입력하여 이동한 뒤, 해당 플래그를 [Enabled]로 변경합니다.',
    urlToCopy: 'chrome://flags/#prompt-api-for-gemini-nano',
    settingName: 'Prompt API for Gemini Nano',
    settingValue: 'Enabled'
  },
  {
    step: 3,
    title: '온디바이스 AI 모델 우회 플래그 활성화 (필수)',
    description: '기기 하드웨어(GPU/배터리) 제약 없이 Gemini Nano 모델을 항상 실행하도록 아래 플래그를 [Enabled BypassPerfRequirement]로 변경합니다.',
    urlToCopy: 'chrome://flags/#optimization-guide-on-device-model',
    settingName: 'Enables optimization guide on device',
    settingValue: 'Enabled BypassPerfRequirement',
    tip: '⚠️ 이 플래그가 빠져 있으면 Prompt API를 켜도 모델이 실행되지 않고 "미활성화" 상태로 남습니다!'
  },
  {
    step: 4,
    title: 'Chrome 브라우저 완전히 다시 시작 (Relaunch)',
    description: '플래그 설정 화면 우측 하단의 [Relaunch (다시 시작)] 버튼을 클릭하여 브라우저 프로세스를 재시작합니다.'
  },
  {
    step: 5,
    title: 'Gemini Nano 모델 다운로드 확인',
    description: '주소창에 chrome://components 를 입력하고 [Optimization Guide On Device Model] 항목의 [업데이트 확인]을 눌러 모델을 다운로드합니다.',
    urlToCopy: 'chrome://components',
    tip: '버전 번호가 0.0.0.0이 아닌 최신 버전(예: 2025.x.x)으로 표시되면 온디바이스 Gemini 탑재 완료!'
  }
];

// ============================================================================
// External / Local API LLM Endpoint Support (OpenAI / Gemini / Ollama / LM Studio / Custom)
// ============================================================================

export interface ApiLlmConfig {
  enabled: boolean;
  presetId: string;
  endpointUrl: string;
  apiKey: string;
  model: string;
}

export interface ApiLlmPreset {
  id: string;
  label: string;
  endpointUrl: string;
  defaultModel: string;
  requiresKey: boolean;
  placeholderKey: string;
  hint: string;
}

export const API_LLM_PRESETS: ApiLlmPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI API',
    endpointUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    requiresKey: true,
    placeholderKey: 'sk-...',
    hint: 'OpenAI 공식 엔드포인트 (gpt-4o-mini, gpt-4o 등)'
  },
  {
    id: 'gemini_api',
    label: 'Google Gemini API',
    endpointUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    defaultModel: 'gemini-2.0-flash',
    requiresKey: true,
    placeholderKey: 'AIzaSy...',
    hint: 'Google AI Studio API 키로 Gemini 2.0 Flash / Pro 호출'
  },
  {
    id: 'ollama',
    label: 'Ollama (로컬)',
    endpointUrl: 'http://localhost:11434/v1/chat/completions',
    defaultModel: 'llama3.2',
    requiresKey: false,
    placeholderKey: '로컬 실행 시 API Key 불필요',
    hint: '로컬 Ollama 서버 (llama3.2, qwen2.5, gemma2 등 무료 실행)'
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (로컬)',
    endpointUrl: 'http://localhost:1234/v1/chat/completions',
    defaultModel: 'local-model',
    requiresKey: false,
    placeholderKey: '로컬 실행 시 API Key 불필요',
    hint: 'LM Studio Local Server (포트 1234 OpenAI 호환 API)'
  },
  {
    id: 'openrouter',
    label: 'OpenRouter / Groq',
    endpointUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'google/gemini-2.0-flash-001',
    requiresKey: true,
    placeholderKey: 'sk-or-v1-...',
    hint: 'OpenRouter, Groq, DeepSeek, vLLM 등 OpenAI 호환 엔드포인트'
  },
  {
    id: 'custom',
    label: '직접 입력 (Custom)',
    endpointUrl: '',
    defaultModel: '',
    requiresKey: false,
    placeholderKey: 'Bearer 토큰 또는 API Key (선택)',
    hint: '사내 LLM 게이트웨이, vLLM, 프록시 서버 등 원하는 엔드포인트 URL 입력'
  }
];

const API_LLM_STORAGE_KEY = 'daiso_fitter_api_llm_config_v1';

export function loadApiLlmConfig(): ApiLlmConfig {
  try {
    const raw = localStorage.getItem(API_LLM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: Boolean(parsed.enabled),
        presetId: parsed.presetId || 'openai',
        endpointUrl: parsed.endpointUrl ?? 'https://api.openai.com/v1/chat/completions',
        apiKey: parsed.apiKey || '',
        model: parsed.model || 'gpt-4o-mini'
      };
    }
  } catch {
    // Ignore storage errors
  }
  return {
    enabled: false,
    presetId: 'openai',
    endpointUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-4o-mini'
  };
}

export function saveApiLlmConfig(cfg: ApiLlmConfig): void {
  try {
    localStorage.setItem(API_LLM_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // Ignore storage errors
  }
}

export async function testApiLlmConnection(
  backendUrl: string,
  config: ApiLlmConfig
): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  if (!config.endpointUrl.trim()) {
    return { ok: false, message: '엔드포인트 URL을 입력해주세요.' };
  }

  try {
    const res = await fetch(`${backendUrl}/api/ai/llm-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint_url: config.endpointUrl.trim(),
        api_key: config.apiKey.trim(),
        model: config.model.trim() || 'gpt-4o-mini'
      })
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, message: data.detail || `연결 실패 (HTTP ${res.status})` };
    }
    return {
      ok: true,
      latencyMs: data.latency_ms,
      message: `연결 성공! (${data.provider.toUpperCase()} · ${data.latency_ms}ms · 응답: "${data.reply_preview}")`
    };
  } catch (err: any) {
    // Fallback direct fetch test if backend proxy is unreachable
    try {
      const t0 = performance.now();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.apiKey.trim()) {
        headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
      }
      const directRes = await fetch(config.endpointUrl.trim(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model.trim() || 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Reply OK' }],
          max_tokens: 10
        })
      });
      const latencyMs = Math.round(performance.now() - t0);
      if (directRes.ok) {
        return { ok: true, latencyMs, message: `직접 연결 성공! (${latencyMs}ms)` };
      }
      return { ok: false, message: `엔드포인트 오류 (HTTP ${directRes.status})` };
    } catch {
      return { ok: false, message: err?.message || '엔드포인트에 연결할 수 없습니다.' };
    }
  }
}

export async function selectCandidatesWithApiLlm(
  backendUrl: string,
  config: ApiLlmConfig,
  purpose: string,
  candidateNames: string[]
): Promise<{ selectedIndices: number[]; rationale: string; latencyMs?: number }> {
  // 1. Primary path: Call backend proxy (/api/ai/llm-select) to avoid browser CORS restrictions
  const res = await fetch(`${backendUrl}/api/ai/llm-select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint_url: config.endpointUrl.trim(),
      api_key: config.apiKey.trim(),
      model: config.model.trim() || 'gpt-4o-mini',
      purpose,
      candidates: candidateNames
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `API LLM 호출 오류 (HTTP ${res.status})`);
  }

  const data = await res.json();
  return {
    selectedIndices: Array.isArray(data.selected_indices) ? data.selected_indices : [],
    rationale: data.rationale || '',
    latencyMs: data.latency_ms
  };
}
