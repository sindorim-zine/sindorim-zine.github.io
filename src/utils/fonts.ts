// 사이트에서 고를 수 있는 한글 서체 목록
// 모두 SIL Open Font License 1.1(OFL) — 상업적 사용·웹 임베딩·수정 무료, 출처 표기 의무 없음.
// Google Fonts(fonts.googleapis.com)와 jsDelivr(Pretendard)에서 불러오며, 사이트는 '고른 서체만' 내려받습니다.

export type FontDef = {
  /** CMS·문서에 보여 줄 이름 */
  label: string;
  /** CSS font-family 값 */
  stack: string;
  /** Google Fonts css2 family 파라미터 (Pretendard는 null) */
  google: string | null;
  /** 굵기가 하나뿐인 서체: 제목을 억지로 굵게 만들지 않도록 보통 굵기로 표시 */
  singleWeight?: boolean;
  /** 손글씨처럼 글자가 작아 보이는 서체 보정값(font-size-adjust) */
  sizeAdjust?: number;
};

const SERIF_FALLBACK = '"Nanum Myeongjo", "AppleMyungjo", serif';
const SANS_FALLBACK = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

export const HEADING_FONT_DEFS = {
  serif: { label: '고운바탕 — 따뜻한 감성 명조 (기본)', stack: `"Gowun Batang", ${SERIF_FALLBACK}`, google: 'Gowun+Batang:wght@400;700' },
  myeongjo: { label: '나눔명조 — 단정한 잡지 명조', stack: `"Nanum Myeongjo", ${SERIF_FALLBACK}`, google: 'Nanum+Myeongjo:wght@400;700;800' },
  'noto-serif': { label: '노토 세리프 — 또렷하고 우아한 명조', stack: `"Noto Serif KR", ${SERIF_FALLBACK}`, google: 'Noto+Serif+KR:wght@500;700' },
  hahmlet: { label: '함렛 — 현대적이고 세련된 명조', stack: `"Hahmlet", ${SERIF_FALLBACK}`, google: 'Hahmlet:wght@500;700' },
  songmyung: { label: '송명 — 붓글씨 느낌의 고풍스러운 명조', stack: `"Song Myung", ${SERIF_FALLBACK}`, google: 'Song+Myung', singleWeight: true },
  diphylleia: { label: '디필레아 — 가늘고 우아한 장식 명조', stack: `"Diphylleia", ${SERIF_FALLBACK}`, google: 'Diphylleia', singleWeight: true },
  sans: { label: '프리텐다드 — 깔끔한 모던 고딕', stack: `"Pretendard Variable", Pretendard, ${SANS_FALLBACK}`, google: null },
  dodum: { label: '고운돋움 — 부드럽고 둥근 고딕', stack: `"Gowun Dodum", ${SANS_FALLBACK}`, google: 'Gowun+Dodum', singleWeight: true },
  pen: { label: '나눔손글씨 펜 — 정겨운 손글씨', stack: `"Nanum Pen Script", "Gowun Dodum", cursive`, google: 'Nanum+Pen+Script', singleWeight: true, sizeAdjust: 0.58 },
} satisfies Record<string, FontDef>;

export const BODY_FONT_DEFS = {
  pretendard: { label: '프리텐다드 — 깔끔하고 읽기 편한 고딕 (기본)', stack: `"Pretendard Variable", Pretendard, ${SANS_FALLBACK}`, google: null },
  dodum: { label: '고운돋움 — 부드럽고 따뜻한 고딕', stack: `"Gowun Dodum", ${SANS_FALLBACK}`, google: 'Gowun+Dodum' },
  'noto-sans': { label: '노토 산스 — 표준적이고 또렷한 고딕', stack: `"Noto Sans KR", ${SANS_FALLBACK}`, google: 'Noto+Sans+KR:wght@400;500;700' },
  plex: { label: 'IBM Plex Sans KR — 단정한 정보형 고딕', stack: `"IBM Plex Sans KR", ${SANS_FALLBACK}`, google: 'IBM+Plex+Sans+KR:wght@400;500;600;700' },
  myeongjo: { label: '나눔명조 — 브런치 에세이 같은 명조 본문', stack: `"Nanum Myeongjo", ${SERIF_FALLBACK}`, google: 'Nanum+Myeongjo:wght@400;700' },
} satisfies Record<string, FontDef>;

export type HeadingFont = keyof typeof HEADING_FONT_DEFS;
export type BodyFont = keyof typeof BODY_FONT_DEFS;
export const HEADING_FONTS = Object.keys(HEADING_FONT_DEFS) as HeadingFont[];
export const BODY_FONTS = Object.keys(BODY_FONT_DEFS) as BodyFont[];

const PRETENDARD_CSS = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

/** 고른 제목·본문 서체에 필요한 스타일시트 주소만 돌려줍니다. */
export function fontStylesheets(heading: HeadingFont, body: BodyFont): string[] {
  const h: FontDef = HEADING_FONT_DEFS[heading];
  const b: FontDef = BODY_FONT_DEFS[body];
  const urls: string[] = [];
  if (h.google === null || b.google === null) urls.push(PRETENDARD_CSS);
  // 같은 서체(예: 나눔명조 제목+본문)는 굵기를 합쳐 한 번만 요청
  const byFamily = new Map<string, Set<string>>();
  for (const spec of [h.google, b.google]) {
    if (!spec) continue;
    const [family, axis] = spec.split(':');
    const weights = byFamily.get(family) ?? new Set<string>();
    for (const w of (axis?.replace(/^wght@/, '') ?? '').split(';').filter(Boolean)) weights.add(w);
    byFamily.set(family, weights);
  }
  const families = [...byFamily.entries()].map(([family, weights]) =>
    weights.size ? `${family}:wght@${[...weights].sort((x, y) => Number(x) - Number(y)).join(';')}` : family,
  );
  if (families.length) urls.push(`https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`);
  return urls;
}
