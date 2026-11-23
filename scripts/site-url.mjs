// 사이트 주소(site)와 하위 경로(base)를 환경변수에서 자동 계산합니다.
// astro.config.mjs와 scripts/indexnow-ping.mjs가 함께 사용하므로, 운영자는 이 파일을 수정할 필요가 없습니다.
//
// 우선순위
//   1) SITE_URL  (커스텀 도메인 사용 시 GitHub 저장소 Variables에 등록: 예 https://www.example.com)
//   2) GITHUB_REPOSITORY (GitHub Actions가 자동 주입: owner/repo)
//   3) 로컬 개발 폴백: http://localhost:4321, base '/'

export function resolveSiteAndBase(env = process.env) {
  const siteUrl = (env.SITE_URL || '').trim();
  if (siteUrl) {
    try {
      const url = new URL(siteUrl);
      const base = url.pathname.replace(/\/+$/, '') || '/';
      return { site: url.origin, base };
    } catch {
      console.warn(`[site-url] SITE_URL 값이 올바른 주소가 아니어서 무시합니다: ${siteUrl}`);
    }
  }

  const repository = (env.GITHUB_REPOSITORY || '').trim();
  if (/^[^/\s]+\/[^/\s]+$/.test(repository)) {
    const [owner, repo] = repository.split('/');
    const ownerLower = owner.toLowerCase();
    const site = `https://${ownerLower}.github.io`;
    if (repo.toLowerCase() === `${ownerLower}.github.io`) {
      return { site, base: '/' };
    }
    return { site, base: `/${repo}` };
  }

  return { site: 'http://localhost:4321', base: '/' };
}

/** base가 반영된 사이트 루트 주소 (끝 슬래시 없음). 예: https://owner.github.io/repo */
export function siteRoot(env = process.env) {
  const { site, base } = resolveSiteAndBase(env);
  return `${site}${base === '/' ? '' : base}`;
}
