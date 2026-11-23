// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { resolveSiteAndBase } from './scripts/site-url.mjs';
import { satteri } from '@astrojs/markdown-satteri';
import basePathHastPlugin from './scripts/markdown-base-path.mjs';
import { lastmodSerializer } from './scripts/sitemap-lastmod.mjs';

// 저장소 이름·아이디를 직접 적지 않습니다. GitHub Actions의 GITHUB_REPOSITORY(또는 SITE_URL)로 자동 계산됩니다.
const { site, base } = resolveSiteAndBase();

export default defineConfig({
  output: 'static',
  site,
  base,
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  markdown: {
    // 본문 속 /images/uploads/... 와 /about 같은 내부 링크에도 base 경로 자동 적용
    processor: satteri({ hastPlugins: [basePathHastPlugin(base)] }),
  },
  integrations: [
    sitemap({
      // 404와 QR 모음(운영 도구)은 검색 대상이 아니므로 사이트맵에서 뺍니다.
      filter: (page) => !/\/(404|qr)\/?$/.test(page),
      // 글마다 마지막 수정일(lastmod)을 넣어 검색엔진이 새 글·바뀐 글을 먼저 다시 수집하게 합니다.
      serialize: lastmodSerializer(base),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
