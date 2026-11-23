// 모든 내부 링크·이미지·스크립트 경로는 이 헬퍼를 거칩니다.
// 루트 저장소(owner.github.io), 서브패스 저장소(/repo), 커스텀 도메인 어디에 배포해도 경로가 깨지지 않습니다.

const RAW_BASE = import.meta.env.BASE_URL || '/';
const BASE = RAW_BASE.replace(/\/+$/, ''); // '' 또는 '/repo'

const EXTERNAL_PATTERN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i; // https:, mailto:, tel:, data:, //cdn...

/** http(s)·mailto 등 외부 주소인지 판별 */
export function isExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return EXTERNAL_PATTERN.test(url.trim());
}

/** 내부 경로에 base를 붙입니다. 외부 주소·앵커(#)는 그대로 반환합니다. */
export function withBase(path: string | null | undefined = '/'): string {
  const value = (path ?? '').trim();
  if (!value) return BASE ? `${BASE}/` : '/';
  if (isExternalUrl(value) || value.startsWith('#')) return value;

  const normalized = withTrailingSlash(value.startsWith('/') ? value : `/${value}`);
  if (BASE && (normalized === BASE || normalized.startsWith(`${BASE}/`))) return normalized;
  return `${BASE}${normalized}` || '/';
}

/**
 * 페이지 주소는 끝에 '/'를 붙입니다(예: /about → /about/). GitHub Pages가 /about을 /about/로
 * 한 번 더 이동(301)시키는 낭비를 없앱니다. 파일(.xml, .jpg 등)·쿼리·앵커가 있는 주소는 그대로 둡니다.
 */
function withTrailingSlash(path: string): string {
  const cut = path.search(/[?#]/);
  const pathname = cut === -1 ? path : path.slice(0, cut);
  const rest = cut === -1 ? '' : path.slice(cut);
  if (pathname.endsWith('/')) return path;
  const last = pathname.slice(pathname.lastIndexOf('/') + 1);
  if (last.includes('.')) return path;
  return `${pathname}/${rest}`;
}

/** 검색엔진·OpenGraph용 완전한 절대 주소 (https://...) */
export function absoluteUrl(path: string | null | undefined, site: URL | string | undefined): string {
  const value = (path ?? '').trim();
  if (isExternalUrl(value) && !value.startsWith('//')) return value;
  const origin = site ?? 'http://localhost:4321';
  return new URL(withBase(value || '/'), origin).href;
}

/** 게시글 상세 페이지 경로 */
export function postPath(id: string): string {
  return `/posts/${id}/`;
}

/** 게시글 마크다운 미러 경로 */
export function postMarkdownPath(id: string): string {
  return `/posts/${id}.md`;
}

/** 유효한 http(s) 주소인지 확인 (cafeUrl·originalUrl 검증용) */
export function isHttpUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}
