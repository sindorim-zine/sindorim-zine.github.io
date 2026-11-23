import { getCollection, type CollectionEntry } from 'astro:content';
import siteConfigJson from '../data/siteConfig.json';
import aboutJson from '../data/about.json';
import { isHttpUrl } from './url';
import { BODY_FONTS, HEADING_FONTS, type BodyFont, type HeadingFont } from './fonts';

export type Post = CollectionEntry<'posts'>;

export const THEME_PRESETS = ['sage', 'blossom', 'terracotta', 'winter-navy', 'minimal-mono'] as const;
export const HERO_STYLES = ['magazine-card', 'full-visual', 'minimal-typo'] as const;
export const VIEW_MODES = ['grid', 'list'] as const;

export type ThemePreset = (typeof THEME_PRESETS)[number];
export type HeroStyle = (typeof HERO_STYLES)[number];
export type ViewMode = (typeof VIEW_MODES)[number];

/** 브라우저 주소창 색상(<meta name="theme-color">)용 테마별 대표 색 */
export const THEME_COLORS: Record<ThemePreset, { background: string; accent: string }> = {
  sage: { background: '#FAF8F5', accent: '#4A6B5D' },
  blossom: { background: '#FDF9F9', accent: '#C85A70' },
  terracotta: { background: '#FBF7F2', accent: '#B85D3B' },
  'winter-navy': { background: '#F7F8FA', accent: '#23395B' },
  'minimal-mono': { background: '#FAFAFA', accent: '#18181B' },
};

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

type NavItem = { label: string; url: string };

/** '<meta name="google-site-verification" content="abc" />' 또는 'abc' → 'abc' (안전한 문자만 허용) */
function verificationCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  const fromTag = /content\s*=\s*["']([^"']+)["']/i.exec(raw)?.[1] ?? raw;
  return /^[A-Za-z0-9_\-:.=+/]{6,200}$/.test(fromTag.trim()) ? fromTag.trim() : '';
}

const raw = siteConfigJson as Record<string, any>;
const rawDesign = (raw.design ?? {}) as Record<string, unknown>;
const rawBanner = (raw.eventBanner ?? {}) as Record<string, unknown>;

/** CMS에서 잘못된 값이 들어와도 사이트가 깨지지 않도록 기본값으로 보정한 설정 */
export const siteConfig = {
  siteTitle: text(raw.siteTitle, '신도림 커뮤니티'),
  siteDescription: text(raw.siteDescription),
  representativeName: text(raw.representativeName, '신도림 커뮤니티 운영진') || '신도림 커뮤니티 운영진',
  cafeUrl: isHttpUrl(raw.cafeUrl) ? (raw.cafeUrl as string) : '',
  indexNowKey: text(raw.indexNowKey),
  // 검색엔진 소유 확인 코드: 운영자가 meta 태그 전체를 붙여 넣어도 content 값만 골라 씁니다.
  verification: {
    google: verificationCode((raw.searchVerification ?? {}).google),
    naver: verificationCode((raw.searchVerification ?? {}).naver),
    bing: verificationCode((raw.searchVerification ?? {}).bing),
  },
  heroTitle: text(raw.heroTitle),
  heroSubtitle: text(raw.heroSubtitle),
  heroImage: text(raw.heroImage),
  categories: Array.isArray(raw.categories)
    ? (raw.categories as unknown[]).filter((c): c is string => typeof c === 'string' && c.trim() !== '')
    : [],
  navigation: Array.isArray(raw.navigation)
    ? (raw.navigation as NavItem[]).filter((n) => n && typeof n.label === 'string' && typeof n.url === 'string' && n.url)
    : [],
  footerText: text(raw.footerText),
  design: {
    themePreset: pick<ThemePreset>(rawDesign.themePreset, THEME_PRESETS, 'sage'),
    heroStyle: pick<HeroStyle>(rawDesign.heroStyle, HERO_STYLES, 'magazine-card'),
    headingFont: pick<HeadingFont>(rawDesign.headingFont, HEADING_FONTS, 'serif'),
    bodyFont: pick<BodyFont>(rawDesign.bodyFont, BODY_FONTS, 'pretendard'),
    defaultViewMode: pick<ViewMode>(rawDesign.defaultViewMode, VIEW_MODES, 'grid'),
    defaultSort: pick<'newest' | 'event' | 'oldest' | 'title'>(rawDesign.defaultSort, ['newest', 'event', 'oldest', 'title'], 'newest'),
  },
  eventBanner: {
    enabled: rawBanner.enabled === true,
    badge: text(rawBanner.badge, 'EVENT'),
    text: text(rawBanner.text),
    linkText: text(rawBanner.linkText),
    linkUrl: text(rawBanner.linkUrl),
  },
};

export type AboutData = {
  introTitle: string;
  introLead: string;
  introBody: string;
  coreValues: { title: string; description: string }[];
  milestones: { period: string; event: string }[];
  faqs: { question: string; answer: string }[];
  locationInfo: string;
};

const rawAbout = aboutJson as Record<string, any>;
const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]).filter(Boolean) : []);

export const about: AboutData = {
  introTitle: text(rawAbout.introTitle),
  introLead: text(rawAbout.introLead),
  introBody: text(rawAbout.introBody),
  coreValues: list(rawAbout.coreValues),
  milestones: list(rawAbout.milestones),
  faqs: list<{ question: string; answer: string }>(rawAbout.faqs).filter((f) => f.question && f.answer),
  locationInfo: text(rawAbout.locationInfo, '서울특별시 구로구 신도림동 일대'),
};

/** 정렬용 발행 시각(같은 날 글 구분). 없으면 0 */
export function publishedTime(post: Post): number {
  const t = post.data.publishedAt?.getTime();
  return t && !Number.isNaN(t) ? t : 0;
}

/** 최신순 비교: 작성일 → 실제 발행 시각 → 파일 이름 순으로 내림차순 */
export function compareNewest(a: Post, b: Post): number {
  return (
    b.data.pubDate.getTime() - a.data.pubDate.getTime() ||
    publishedTime(b) - publishedTime(a) ||
    b.id.localeCompare(a.id)
  );
}

/** 공개 게시글: draft 제외, 고정글 우선 → 최신순 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => data.draft !== true);
  return posts.sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    return compareNewest(a, b);
  });
}

/** 방문자 정렬 옵션 (운영자가 CMS에서 기본값 선택) */
export const SORT_OPTIONS = [
  { value: 'newest', label: '최신순' },
  { value: 'event', label: '다가오는 행사순' },
  { value: 'oldest', label: '오래된순' },
  { value: 'title', label: '제목순' },
] as const;
export type SortMode = (typeof SORT_OPTIONS)[number]['value'];

// ── 행사 정보 ────────────────────────────────────────────────────────────
export type EventInfo = { start: string; end: string; label: string };

/** 글의 행사 정보 (없으면 null). 종료일이 없거나 시작일보다 앞서면 시작일과 같게 봅니다. */
export function eventOf(post: Post): EventInfo | null {
  const start = post.data.eventDate;
  if (!start) return null;
  const end = post.data.eventEndDate && post.data.eventEndDate >= start ? post.data.eventEndDate : start;
  return { start, end, label: (post.data.eventLabel ?? '').trim() || '행사일' };
}

/** 한국 시간 기준 오늘 날짜 'YYYY-MM-DD' */
export function todayKst(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** '2026-12-07' → '12월 7일(월)' */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일(${weekday})`;
}

/** 카드·상세 페이지에 보여 줄 행사 날짜 글: '12월 7일(월) 접수 마감' / '11월 16일(월) ~ 11월 30일(월) 이벤트 기간' */
export function formatEvent(event: EventInfo): string {
  const range = event.end !== event.start ? `${formatDay(event.start)} ~ ${formatDay(event.end)}` : formatDay(event.start);
  return `${range} ${event.label}`;
}

/** 다가오는 행사순: 진행 중·다가오는 행사(가까운 날짜부터) → 지난 행사(최근 종료부터) → 행사 없는 글(최신순) */
export function compareEvent(a: Post, b: Post, today = todayKst()): number {
  const ea = eventOf(a);
  const eb = eventOf(b);
  const group = (e: EventInfo | null) => (!e ? 2 : e.end >= today ? 0 : 1);
  const ga = group(ea);
  const gb = group(eb);
  if (ga !== gb) return ga - gb;
  if (ga === 0) return ea!.start.localeCompare(eb!.start) || ea!.end.localeCompare(eb!.end) || compareNewest(a, b);
  if (ga === 1) return eb!.end.localeCompare(ea!.end) || compareNewest(a, b);
  return compareNewest(a, b);
}

/** 서버에서 미리 정렬해 둡니다(자바스크립트가 꺼져 있어도 기본 정렬로 보임). */
export function sortPosts(posts: Post[], mode: SortMode): Post[] {
  const list = [...posts];
  if (mode === 'oldest') return list.sort((a, b) => compareNewest(b, a));
  if (mode === 'title') return list.sort((a, b) => a.data.title.localeCompare(b.data.title, 'ko') || compareNewest(a, b));
  if (mode === 'event') {
    const today = todayKst();
    return list.sort((a, b) => compareEvent(a, b, today));
  }
  return list.sort(compareNewest);
}

/** 탭에 보여 줄 카테고리: 설정의 순서를 따르되 글이 있는 카테고리만, 설정에 없는 글 카테고리는 뒤에 덧붙입니다. */
export function collectCategories(posts: Post[]): string[] {
  const used = new Set(posts.map((p) => p.data.category).filter(Boolean));
  const ordered = siteConfig.categories.filter((c) => used.has(c));
  for (const category of used) {
    if (!ordered.includes(category)) ordered.push(category);
  }
  return ordered;
}

/** 'AI 3줄 요약'을 문장 단위 목록으로 나눕니다. */
export function splitSummary(summary: string | undefined | null): string[] {
  const value = (summary ?? '').trim();
  if (!value) return [];
  const lines = value.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  return value
    .split(/(?<=[.!?。])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(date);
}

export function isoDate(date: Date): string {
  return date.toISOString();
}

/** 고정글 → 글 대표 이미지 경로 (빈 값이면 null) */
export function thumbnailOf(post: Post): string | null {
  const value = (post.data.thumbnail ?? '').trim();
  return value ? value : null;
}

export type IllustrationVariant = 'notice' | 'meetup' | 'local' | 'life' | 'food';

/** 카테고리 이름으로 기본 일러스트를 고릅니다. 새 카테고리도 자동으로 하나가 배정됩니다. */
export function illustrationFor(category: string): IllustrationVariant {
  const c = category || '';
  if (/공지|안내|알림/.test(c)) return 'notice';
  if (/모임|행사|이벤트|축제/.test(c)) return 'meetup';
  if (/맛집|카페|음식|식당|먹/.test(c)) return 'food';
  if (/생활|정보|팁|육아|교육/.test(c)) return 'life';
  if (/동네|소식|뉴스|지역/.test(c)) return 'local';
  const variants: IllustrationVariant[] = ['local', 'meetup', 'life', 'food', 'notice'];
  let hash = 0;
  for (const ch of c) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return variants[hash % variants.length];
}
