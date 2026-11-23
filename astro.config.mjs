// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { resolveSiteAndBase } from './scripts/site-url.mjs';

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
  integrations: [
    sitemap({
      filter: (page) => !/\/404\/?$/.test(page),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
