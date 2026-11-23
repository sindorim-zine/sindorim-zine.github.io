// 운영자가 붙여 넣은 카페 글을 공개용 웹진 기사로 정리하는 공용 모듈
// - Gemini(@google/genai) JSON 스키마 강제 출력
// - 개인정보 마스킹(프롬프트 + 정규식 2차 필터)
// - 원문에 없는 사실 창작 금지(Strict Grounding)

import { createHash } from 'node:crypto';

export const MODEL = (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim();
export const DEFAULT_CATEGORIES = ['공지사항', '모임·행사', '동네 소식', '생활 정보', '맛집·카페'];

// ---------------------------------------------------------------------------
// 개인정보 2차 필터
// URL 안의 숫자(네이버 글 번호 등)는 건드리지 않고, 앞뒤가 숫자인 경우(날짜·금액 일부)는 가리지 않습니다.
// ---------------------------------------------------------------------------
function scrubPiiSegment(text) {
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[비공개]')
    // 휴대폰: 010-1234-5678, 01012345678, +82 10-1234-5678
    .replace(/(?<![\d-])(?:\+82[-\s]?1[016789]|01[016789])[-\s.]?\d{3,4}[-\s.]?\d{4}(?![\d-])/g, '[비공개]')
    // 지역번호 전화: 02-123-4567, 031-1234-5678 (구분자 필수)
    .replace(/(?<![\d-])0\d{1,2}[-\s.]\d{3,4}[-\s.]\d{4}(?![\d-])/g, '[비공개]')
    // 계좌번호 형태: 123-456-789012 (마지막 묶음 4자리 이상이라 날짜 2026-11-20은 제외)
    .replace(/(?<![\d-])\d{3,6}-\d{2,6}-\d{4,8}(?:-\d{1,6})?(?![\d-])/g, '[비공개]')
    // 상세 주소: 101동 1203호
    .replace(/\d{2,4}\s?동\s?\d{2,4}\s?호/g, '[비공개]');
}

export function scrubPii(text) {
  return String(text ?? '')
    .split(/(https?:\/\/[^\s)<>"']+)/g)
    .map((part, i) => (i % 2 === 1 ? part : scrubPiiSegment(part)))
    .join('');
}

// ---------------------------------------------------------------------------
// 공통 유틸
// ---------------------------------------------------------------------------
export function toSlug(value, fallbackSeed) {
  const words = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 6);
  if (words.length >= 2) return words.join('-').slice(0, 80).replace(/-+$/, '');
  return `cafe-post-${createHash('sha1').update(String(fallbackSeed)).digest('hex').slice(0, 8)}`;
}

export function kstDateString(date = new Date()) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(String(url).trim());
    u.hash = '';
    u.hostname = u.hostname.toLowerCase().replace(/^m\./, '');
    const params = [...u.searchParams.entries()].filter(([k]) => !/^(utm_|ref|fromList|boardtype|referrerAllArticles)/i.test(k));
    params.sort(([a], [b]) => a.localeCompare(b));
    u.search = params.length ? `?${new URLSearchParams(params)}` : '';
    return u.toString().replace(/\/+$/, '');
  } catch {
    return String(url).trim();
  }
}

/** YAML Frontmatter를 JSON.stringify로 안전하게 직렬화한 마크다운 */
export function buildPostMarkdown({ title, pubDate, category, summary, pinned = false, draft = false, thumbnail, originalUrl, body }) {
  const lines = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `pubDate: ${JSON.stringify(pubDate)}`,
    `category: ${JSON.stringify(category)}`,
    `summary: ${JSON.stringify(summary)}`,
    `pinned: ${pinned ? 'true' : 'false'}`,
    `draft: ${draft ? 'true' : 'false'}`,
  ];
  if (thumbnail) lines.push(`thumbnail: ${JSON.stringify(thumbnail)}`);
  if (originalUrl) lines.push(`originalUrl: ${JSON.stringify(originalUrl)}`);
  lines.push('---', '', String(body).trim(), '');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------
function systemInstruction(categories) {
  return `당신은 서울 구로구 신도림동 지역 커뮤니티 '신도림 커뮤니티'(네이버 카페)의 공식 웹 아카이브 편집자입니다.
운영진이 카페에서 골라 붙여 넣은 글을, 외부 독자와 AI 검색엔진이 이해하기 쉬운 공개용 기사로 다듬습니다.

[개인정보 보호 — 반드시 지킬 것]
- 일반 회원의 실명, 닉네임과 결합된 신상, 휴대폰·전화번호, 계좌번호, 이메일, 카카오톡 ID·오픈채팅 링크, 상세 주소(아파트 동·호수, 번지)를 절대 출력하지 마세요.
- 개인을 가리키는 표현은 "[회원]"으로 바꾸고, 번호·계좌·이메일은 삭제하거나 "[비공개]"로 표시하세요.
- 공식 단체명, 공공기관, 상호명, 공개 장소명(예: 도림천, 신도림역)처럼 공개된 정보와 운영진 공지 내용은 남겨도 됩니다.

[사실 창작 금지 — Strict Grounding]
- 입력 원문에 적힌 사실만 사용하세요. 원문에 없는 날짜, 요일, 시간, 장소, 회비·가격, 인원, 준비물, 연락 방법을 절대 추측하거나 지어내지 마세요.
- 원문에 있는 일정·장소·금액은 정확히 그대로 옮기세요. 숫자를 바꾸거나 반올림하지 마세요.
- 원문이 중간에 끊겨 세부 정보를 알 수 없으면 본문 마지막에 "자세한 내용은 하단의 네이버 카페 원문에서 확인하실 수 있습니다."라고 안내하세요.
- 원문에 [[사진1]], [[사진2]] 같은 사진 표시가 있으면 markdownBody에서도 원래 문맥과 가까운 위치에 그 표시를 한 줄로 그대로 남기세요. 새 표시를 만들거나 번호를 바꾸거나 빼지 마세요.
- 과장, 홍보성 수식어, 원문에 없는 의견을 덧붙이지 마세요. 카페 말투(ㅋㅋ, 이모티콘 남발, 반말)는 정중한 존댓말 기사체로 바꾸세요.

[출력 필드]
- cleanTitle: 외부 사용자가 ChatGPT·Gemini·네이버에 질문할 법한 자연스러운 한국어 제목. 원문 사실 범위 안에서 "신도림" 같은 지역·맥락 키워드를 자연스럽게 포함. 40자 안팎.
- urlSlug: 제목 의미를 담은 영문 소문자·숫자·하이픈 3~6단어 (예: sindorim-year-end-party-guide). 한글·공백·특수문자 금지.
- summary: 원문 사실만으로 쓴 정확히 3문장의 핵심 요약.
- category: 다음 중 하나만 선택: ${categories.join(', ')}
- markdownBody: 한국어 마크다운 본문. 첫 줄에 제목(#)을 쓰지 마세요. 필요하면 ## 소제목, 목록, 굵은 글씨로 읽기 쉽게 정리하되 원문의 중요한 정보는 빠뜨리지 마세요.`;
}

/**
 * @returns {Promise<{cleanTitle:string,urlSlug:string,summary:string,category:string,markdownBody:string}>}
 */
export async function writeWithGemini({ apiKey, categories, sourceText, hintTitle, hintCategory }) {
  const { GoogleGenAI, Type } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const userText = [
    '다음은 운영진이 네이버 카페에서 붙여 넣은 글입니다. 규칙에 따라 JSON으로 변환하세요.',
    hintTitle ? `운영진이 정한 제목(가능하면 그대로 쓰고, 다듬더라도 의미를 바꾸지 마세요): ${hintTitle}` : '',
    hintCategory ? `운영진이 정한 카테고리(반드시 이 값을 사용): ${hintCategory}` : '',
    '',
    '----- 원문 시작 -----',
    sourceText,
    '----- 원문 끝 -----',
  ]
    .filter((l) => l !== '')
    .join('\n');

  const request = (model) => ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    config: {
      systemInstruction: systemInstruction(categories),
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cleanTitle: { type: Type.STRING, description: '외부 검색 최적화 한국어 제목' },
          urlSlug: { type: Type.STRING, description: '영문 소문자·숫자·하이픈 3~6단어' },
          summary: { type: Type.STRING, description: '원문 사실만 담은 3문장 요약' },
          category: { type: Type.STRING, enum: categories, description: '카테고리' },
          markdownBody: { type: Type.STRING, description: '마크다운 본문' },
        },
        required: ['cleanTitle', 'urlSlug', 'summary', 'category', 'markdownBody'],
        propertyOrdering: ['cleanTitle', 'urlSlug', 'summary', 'category', 'markdownBody'],
      },
    },
  });

  // 1) 모델이 종료됐으면 안내된 후속 모델로 전환
  // 2) 일시적 혼잡(503·429 등)이면 잠시 기다렸다 재시도, 계속 혼잡하면 다른 flash 모델로 전환
  const tried = new Set();
  const queue = [activeModel, ...FALLBACK_MODELS.filter((m) => m !== activeModel)];
  let response;
  let lastError;
  while (!response && queue.length) {
    const model = queue.shift();
    if (tried.has(model)) continue;
    tried.add(model);
    for (let attempt = 1; attempt <= 3 && !response; attempt++) {
      try {
        response = await request(model);
        if (model !== activeModel) {
          console.log(`[ai-writer] ${activeModel} 대신 ${model}(으)로 처리했습니다`);
          activeModel = model;
        }
      } catch (error) {
        lastError = error;
        if (isModelError(error)) {
          const next = await suggestModel(ai, error);
          if (next && !tried.has(next)) queue.unshift(next);
          console.log(`[ai-writer] 모델 ${model} 사용 불가${next ? ` → ${next} 시도` : ''}`);
          break;
        }
        if (isTransientError(error) && attempt < 3) {
          const wait = attempt * 8000;
          console.log(`[ai-writer] ${model} 일시적 혼잡 → ${wait / 1000}초 후 재시도 (${attempt}/3)`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        if (isTransientError(error)) {
          console.log(`[ai-writer] ${model} 계속 혼잡 → 다른 모델로 전환`);
          break;
        }
        throw error;
      }
    }
  }
  if (!response) throw lastError ?? new Error('AI 응답을 받지 못했습니다');
  const raw = typeof response.text === 'string' ? response.text : '';
  const data = JSON.parse(raw);
  for (const key of ['cleanTitle', 'urlSlug', 'summary', 'category', 'markdownBody']) {
    if (typeof data[key] !== 'string' || !data[key].trim()) throw new Error(`AI 응답에 ${key}가 비어 있습니다`);
  }
  return data;
}

let activeModel = MODEL;
// 기본 모델이 혼잡하거나 종료됐을 때 차례로 시도할 모델 (공식 문서 기준 현행 flash 계열)
const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];

export function isTransientError(error) {
  const message = error?.message || String(error);
  const status = Number(error?.status ?? error?.code);
  return [429, 500, 502, 503, 504].includes(status) || /UNAVAILABLE|overloaded|high demand|RESOURCE_EXHAUSTED|try again later|DEADLINE_EXCEEDED|INTERNAL/i.test(message);
}

export function isModelError(error) {
  const message = error?.message || String(error);
  const status = Number(error?.status ?? error?.code);
  return status === 404 || /NOT_FOUND|no longer available|is not found|not supported for generateContent/i.test(message);
}

/** 오류 메시지가 안내하는 모델, 없으면 사용 가능한 최신 flash 모델을 고릅니다. */
async function suggestModel(ai, error) {
  const message = error?.message || String(error);
  const hinted = [...message.matchAll(/models\/(gemini-[a-z0-9.-]+)/gi)].map((m) => m[1]).find((m) => m !== activeModel);
  if (hinted) return hinted;
  try {
    const names = [];
    const pager = await ai.models.list();
    for await (const model of pager) {
      const name = String(model.name || '').replace(/^models\//, '');
      const actions = model.supportedActions || model.supportedGenerationMethods || [];
      if (/^gemini-\d+(\.\d+)?-flash$/.test(name) && (!actions.length || actions.includes('generateContent'))) names.push(name);
    }
    const version = (n) => parseFloat(n.replace(/^gemini-/, ''));
    return names.sort((a, b) => version(b) - version(a))[0] || null;
  } catch {
    return null;
  }
}

export function isAuthError(error) {
  const message = error?.message || String(error);
  const status = Number(error?.status ?? error?.code);
  return status === 401 || status === 403 || /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message);
}
