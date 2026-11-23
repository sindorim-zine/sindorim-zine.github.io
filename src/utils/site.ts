import { getCollection, type CollectionEntry } from 'astro:content';
import siteConfigJson from '../data/siteConfig.json';
import aboutJson from '../data/about.json';
import { isHttpUrl } from './url';

export type Post = CollectionEntry<'posts'>;

export const THEME_PRESETS = ['sage', 'blossom', 'terracotta', 'winter-navy', 'minimal-mono'] as const;
export const HERO_STYLES = ['magazine-card', 'full-visual', 'minimal-typo'] as const;
export const HEADING_FONTS = ['serif', 'sans'] as const;
export const VIEW_MODES = ['grid', 'list'] as const;

export type ThemePreset = (typeof THEME_PRESETS)[number];
export type HeroStyle = (typeof HERO_STYLES)[number];
export type HeadingFont = (typeof HEADING_FONTS)[number];
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
    defaultViewMode: pick<ViewMode>(rawDesign.defaultViewMode, VIEW_MODES, 'grid'),
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

/** 공개 게시글: draft 제외, 고정글 우선 → 최신순 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => data.draft !== true);
  return posts.sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    return b.data.pubDate.getTime() - a.data.pubDate.getTime();
  });
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
