# Role & Objective
당신은 최신 정적 사이트 아키텍처(Astro v5+), CSS 디자인 토큰 시스템, AI 검색 최적화(GEO/AEO), Git 기반 Headless CMS, GitHub Actions 자동화 파이프라인에 정통한 수석 풀스택 웹 아키텍트입니다.
네이버 카페('신도림 커뮤니티')의 폐쇄적인 크롤링 제약을 극복하기 위해, **사람에게는 계절과 이벤트에 따라 분위기를 바꿀 수 있는 '브런치·인스타그램 감성의 따뜻한 로컬 웹진'으로 보이고, 검색엔진과 AI 봇(ChatGPT, Gemini, Perplexity 등)에게는 완벽하게 구조화된 데이터를 제공하는 GitHub Pages 정적 웹사이트 및 무인 자동화·CMS 관리 시스템**을 구축해 주세요.

실제 회원 활동은 네이버 카페에서 이루어지므로 직접 방문 트래픽이 적더라도 외부 AI 검색엔진이 이 사이트를 '공식 원본 아카이브'로 신뢰하고 최우선 색인할 수 있도록 설계해야 하며, 비개발자 운영자가 최초 세팅부터 디자인 테마 변경·장기 운영까지 **코드를 단 한 줄도 직접 수정하지 않도록(Zero-Code Touch)** 데이터·디자인 설정과 UI를 100% 분리해야 합니다.

---

# 1. Core Tech Stack & Version Consistency (엄격 준수)
- **Framework:** Astro v5+ 안정 버전 (`output: 'static'`).
  - **문법 통일 (혼용 절대 금지):** 구형 Astro v4의 `defineCollection({ type: 'content' })` 및 `entry.slug` 문법을 절대 쓰지 마세요. 반드시 최신 표준인 **`src/content.config.ts` + `glob({ pattern: "**/*.md", base: "./src/content/posts" })` 로더 + `entry.id` 기반 라우팅**으로 전 구간 통일하세요.
- **Zero-Config GitHub Pages URL 자동 감지 (`astro.config.mjs`):**
  - 사용자가 `astro.config.mjs` 파일을 열어 아이디나 저장소명을 직접 고치지 않아도 되도록 `process.env.GITHUB_REPOSITORY` (예: `owner/repo`)와 `process.env.SITE_URL`을 자동 파싱하세요.
  - `owner.github.io` 형태의 루트 저장소면 `base: '/'`, 일반 저장소면 `base: '/repo'`로 자동 설정하고, 로컬 개발 환경(`GITHUB_REPOSITORY` 미존재)에서는 `site: 'http://localhost:4321'`, `base: '/'`로 안전하게 폴백시켜 `Invalid URL` 빌드 에러를 원천 차단하세요.
- **Styling & Dynamic Design Token Engine (버전 충돌 방지):**
  - 구형 `@astrojs/tailwind` 패키지는 Tailwind v4와 충돌하므로 **절대 설치하지 마세요.** 반드시 최신 공식 방식인 **`tailwindcss` (v4) + `@tailwindcss/vite` 플러그인** 조합만 사용하세요.
  - 글로벌 CSS에 시맨틱 디자인 토큰(`--bg-primary`, `--bg-surface`, `--bg-subtle`, `--text-primary`, `--text-muted`, `--accent-primary`, `--accent-soft`, `--font-heading`)을 정의하고 `<html data-theme="..." data-heading-font="...">` 속성에 따라 전체 컬러와 타이포그래피가 즉시 전환되도록 설계하세요.
  - 한글 웹폰트: `Gowun Batang` (세리프 제목용), `Pretendard` (산세리프 제목/본문 겸용) CDN 프리로드 적용.
- **Icons & Client Logic:** 인라인 SVG 아이콘(또는 경량 Lucide 스크립트) + 최소한의 Vanilla JS (Zero-JS 지향).
- **CMS (무료 웹 관리자):** **Pages CMS (`https://app.pagescms.org`)** 공식 스키마 호환 `.pages.yml` 구성.
- **Search:** Pagefind (`npx pagefind --site dist`) 빌드 후처리 연동 (정적 한국어 전문 검색 지원).
- **Automation:** Node.js (v20+) 기반 RSS 수집(`rss-parser`), 공식 `@google/genai` SDK 연동, `IndexNow` 실시간 색인 핑 스크립트 + GitHub Actions 워크플로우.
- **Hosting:** GitHub Pages (`public/.nojekyll` 필수 생성, 서브패스 및 커스텀 도메인 모두에서 CSS·이미지·내부 링크·Pagefind 스크립트 경로가 절대 깨지지 않도록 `withBase()` 헬퍼 일관 적용).

---

# 2. Design, Theme Presets & UX Specification (무코드 테마 스위치 내장)
운영자가 Pages CMS에서 계절이나 행사에 맞춰 클릭만으로 사이트 인상을 바꿀 수 있도록 아래 **5가지 컬러 테마 프리셋**과 **레이아웃 옵션**을 완벽히 구현하세요.

1. **5종 계절·무드 컬러 테마 프리셋 (`design.themePreset`):**
   - `sage` (도림천 세이지 - 기본값): 웜 아이보리 배경(`#FAF8F5`) + 세이지 그린 포인트(`#4A6B5D`)
   - `blossom` (봄날 벚꽃 웜톤): 소프트 크림 핑크 배경(`#FDF9F9`) + 로즈 코랄 포인트(`#C85A70`)
   - `terracotta` (가을 브런치 에세이): 웜 샌드 배경(`#FBF7F2`) + 테라코타 브라운 포인트(`#B85D3B`)
   - `winter-navy` (연말·송년회 네이비 골드): 포슬린 화이트 배경(`#F7F8FA`) + 딥 네이비(`#23395B`) 및 웜 골드 서브 포인트
   - `minimal-mono` (모던 매거진 모노톤): 퓨어 오프화이트 배경(`#FAFAFA`) + 차콜 블랙 포인트(`#18181B`)
2. **특별 이벤트 상단 띠배너 (`eventBanner`):**
   - `enabled: true`일 때 사이트 최상단(헤더 위)에 테마 포인트 컬러 배경의 공지 바를 렌더링하며, 문구(`text`), 클릭 이동 링크(`linkText`, `linkUrl` — 내부/외부 링크 자동 판별), 배지 아이콘을 표시할 것.
3. **히어로 레이아웃 3종 전환 (`design.heroStyle`):**
   - `magazine-card` (둥근 모서리 감성 카드형 배너 - 기본값)
   - `full-visual` (배경 이미지가 강조되는 와이드 축제·이벤트형 배너)
   - `minimal-typo` (이미지 없이 여백과 타이포그래피만 강조하는 브런치 서문 스타일)
4. **제목 폰트 분위기 전환 (`design.headingFont`):**
   - `serif` (`Gowun Batang` 감성 명조체 - 기본값) vs `sans` (`Pretendard` 깔끔한 모던 고딕체)
5. **기본 피드 뷰 모드 & 방문자 토글 (`design.defaultViewMode`):**
   - 운영자가 기본 첫 화면을 `grid` (인스타 4:5 포토 그리드) 또는 `list` (브런치 에세이 리스트) 중 선택 가능.
   - 방문자도 우측 상단 토글 버튼으로 실시간 전환할 수 있되, `localStorage` 키에 운영자의 `defaultViewMode` 값을 조합(예: `sindorim-view-pref-${defaultViewMode}`)하여 운영자가 행사 시즌에 기본 모드를 변경하면 기존 방문자에게도 새 기본 화면이 우선 반영되도록 구현할 것.
6. **핵심 콘텐츠 레이아웃:**
   - **상단 고정(`pinned: true`) 영역:** 히어로 배너 아래에 시간순 피드보다 항상 최상단 고정 노출 (`📌 중요 안내` 배지).
   - **카테고리 탭 필터 & Pagefind 한국어 검색 모달.**
   - **커뮤니티 핵심 소개 전용 페이지 (`/about`):** 비전, 핵심 활동 카드, 연혁 타임라인, 자주 묻는 질문(FAQ 아코디언) 및 카페 가입 CTA 렌더링.
   - **개별 포스트 상세 페이지 (`/posts/[id]/`):** 상단 'AI 핵심 3줄 요약' 박스, 넉넉한 여백의 본문, 하단 '네이버 카페 원문에서 댓글로 함께하기' CTA 버튼.

---

# 3. Data & Design Separation (유지보수 제로 아키텍처)
코드를 수정하지 않고 데이터 파일과 웹 CMS만으로 콘텐츠와 디자인을 모두 제어할 수 있도록 아래 3가지 데이터 스키마를 설계하세요.

1. **글로벌 사이트 & 디자인 설정 (`src/data/siteConfig.json`):**
   - 기본 정보: `siteTitle`, `siteDescription`, `representativeName` (기본값: "신도림 커뮤니티 운영진"), `cafeUrl`, `indexNowKey` (기본값: `""`), `heroTitle`, `heroSubtitle`, `heroImage`, `categories` 배열, 네비게이션 메뉴 목록, 푸터 문구.
   - **디자인 토큰 설정 객체 (`design`):**
     - `themePreset`: `"sage"` (허용값: `"sage" | "blossom" | "terracotta" | "winter-navy" | "minimal-mono"`)
     - `heroStyle`: `"magazine-card"` (허용값: `"magazine-card" | "full-visual" | "minimal-typo"`)
     - `headingFont`: `"serif"` (허용값: `"serif" | "sans"`)
     - `defaultViewMode`: `"grid"` (허용값: `"grid" | "list"`)
   - **특별 이벤트 배너 객체 (`eventBanner`):**
     - `enabled`: `false` (boolean)
     - `badge`: `"EVENT"`
     - `text`: `"신도림 커뮤니티 새 소식과 모임 일정을 확인해 보세요!"`
     - `linkText`: `"자세히 보기"`
     - `linkUrl`: `"/about"`
2. **커뮤니티 핵심 소개 데이터 (`src/data/about.json`):**
   - `introTitle`, `introLead`, `introBody`, `coreValues` 배열(`title`, `description`), `milestones` 연혁 배열(`period`, `event`), `faqs` 배열(`question`, `answer` — AI 검색 답변에 최적화된 Q&A 4개 샘플 포함), `locationInfo` (`서울특별시 구로구 신도림동 일대`).
3. **게시글 컬렉션 (`src/content.config.ts` & `src/content/posts/*.md`):**
   - Zod 스키마 검증 필드:
     - `title` (string), `pubDate` (z.coerce.date()), `category` (string), `summary` (string), `pinned` (boolean, default: false), `thumbnail` (string, optional - 카테고리별 로컬 SVG 감성 일러스트 자동 폴백, SVG 역시 `currentColor` 또는 테마 변수와 조화되도록 제작), `originalUrl` (string, optional), `sourceGuid` (string, optional), `draft` (boolean, default: false).
   - *샘플 포스트 3개 중 최소 1개는 `pinned: true`로 작성할 것.*

---

# 4. AI & SEO Optimization (저트래픽 환경 극복 & GEO / AEO 필수 사양)
디자인 테마가 어떻게 바뀌든 검색엔진과 AI 봇이 공식 출처로 인식하고 즉시 수집하도록 아래 사양을 구현하세요.

1. **시맨틱 HTML & 메타태그:** 모든 페이지에 Canonical 절대 URL, OpenGraph(`og:image`는 반드시 `new URL(withBase(path), Astro.site)`로 완전한 `https://...` 절대경로 변환), Twitter Card, 현재 테마에 맞는 `<meta name="theme-color">` 자동 생성.
2. **공식 출처 연결용 Schema.org JSON-LD 자동 주입:**
   - 메인 페이지(`/`): `Organization` 및 `WebSite` 스키마에 활동 지역(`서울특별시 구로구 신도림동`)과 **`sameAs: [cafeUrl]` 속성 명시**(유효 URL일 때).
   - 소개 페이지(`/about`): `AboutPage` 및 **`FAQPage` 스키마(`about.json`의 `faqs` 자동 연동)** 주입.
   - 상세 페이지(`/posts/[id]/`): `Article` / `BlogPosting` 스키마 (`headline`, `datePublished`, `description`, `author`, `isBasedOn: originalUrl`, `mainEntityOfPage` 포함).
3. **AI 크롤러 전용 엔드포인트 자동 생성:**
   - `@astrojs/sitemap` 연동 및 동적 `src/pages/robots.txt.ts` 생성 (`Astro.site`와 `BASE_URL`을 반영한 `Sitemap:` 절대주소 및 `GPTBot`, `OAI-SearchBot`, `Google-Extended`, `ClaudeBot`, `PerplexityBot`, `Yeti` 모두 명시적 `Allow: /`).
   - **`/llms.txt` 및 `/llms-full.txt` 동적 엔드포인트:** 최상단에 `about.json`의 커뮤니티 핵심 정의·활동·연혁·FAQ 요약(및 활성화된 경우 `eventBanner` 주요 공지)을 먼저 배치하고, 중요 고정글(`pinned: true`) 섹션과 최신 게시글(`draft: false`) 섹션을 구분해 표준 마크다운으로 출력할 것.
   - **순수 마크다운 미러 엔드포인트 (`src/pages/posts/[id].md.ts`, `src/pages/about.md.ts`):** AI 봇이 HTML 없이 순수 마크다운 원문을 즉시 수집할 수 있게 구현할 것.
4. **IndexNow 실시간 색인 지원 (빈 키 안전 방어 & 서브패스 완벽 호환):**
   - `src/pages/[indexnow].txt.ts`의 `getStaticPaths()`에서 키가 비어 있으면 반드시 빈 배열(`return []`)을 반환하여 초기 빌드 에러를 방지할 것.
   - IndexNow API 전송 시 반드시 **`keyLocation` 파라미터에 서브패스가 포함된 전체 키 파일 URL(`https://username.github.io/repo-name/[KEY].txt`)을 명시**하여 403 인증 실패를 방지할 것.

---

# 5. Zero-Code Management: Pages CMS 설정 (`.pages.yml`)
비개발자가 웹 브라우저(`app.pagescms.org`)에서 마우스 클릭만으로 글 작성, 소개 편집, **디자인·이벤트 테마 변경**까지 모두 수행할 수 있도록 프로젝트 루트에 정확한 `.pages.yml` 파일을 작성하세요.
- `media`:
  - `input: public/images/uploads`
  - `output: /images/uploads`
  - *(컴포넌트 렌더링 시 `/images/uploads/...` 로컬 경로에도 `withBase()` 헬퍼 필수 적용)*
- `content` (직관적인 한글 라벨의 관리 메뉴 구성):
  1. `name: posts`, `label: 게시글 관리 (새 글 작성 및 상단 고정)`, `type: collection`, `path: src/content/posts` — 제목(`string`), 상단 고정(`pinned`, `boolean`), 작성일(`date`), 카테고리(`select`), AI 3줄 요약(`text`), 대표 썸네일(`image`), 카페 원문 URL(`string`), 비공개 여부(`draft`, `boolean`), 본문(`rich-text`).
  2. `name: aboutPage`, `label: 커뮤니티 핵심 소개 (/about) 편집`, `type: file`, `path: src/data/about.json` — 소개 제목, 한 줄 정의, 상세 본문, 핵심 활동 목록, 주요 연혁, 자주 묻는 질문 FAQ, 활동 지역 폼 매핑.
  3. `name: siteConfig`, `label: 사이트 디자인 테마 · 이벤트 배너 · 기본 설정`, `type: file`, `path: src/data/siteConfig.json`:
     - **디자인 제어 필드(`design` object):** 한글 옵션 라벨이 달린 `select` 드롭다운으로 매핑 (`도림천 세이지 (기본)`, `봄날 벚꽃 웜톤`, `가을 브런치 테라코타`, `연말 네이비 골드`, `모던 미니멀 모노톤` / 히어로 스타일 3종 / 제목 폰트 2종 / 기본 첫 화면 모드 2종).
     - **특별 이벤트 상단 배너 필드(`eventBanner` object):** 배너 켜기/끄기(`boolean`), 배지 문구, 안내 문구, 버튼 텍스트, 이동 링크 URL 매핑.
     - **사이트 기본 정보 필드:** 사이트명, 운영진 표기명, 히어로 제목/부제목/배경 이미지, 카페 주소, IndexNow 키, 카테고리 목록, 네비게이션 메뉴 매핑.

---

# 6. Hardened Pipeline: Naver Cafe RSS -> Gemini AI -> GitHub Pages 배포
네이버 카페 RSS(복수 URL 콤마 구분 지원)를 읽어와 마크다운 포스트로 변환하는 스크립트(`scripts/sync-rss.mjs`)와 GitHub Actions(`.github/workflows/sync-and-deploy.yml`)를 작성하세요.

1. **초기 세팅 에러 방지 (Graceful Skip):**
   - `NAVER_CAFE_RSS_URL`, `GEMINI_API_KEY`, `INDEXNOW_KEY` 환경변수가 비어 있거나 유효하지 않으면 **절대 에러 코드(`process.exit(1)`)를 내지 말고**, 안내 로그만 남긴 뒤 정상 종료(`process.exit(0)`)하여 초기 빌드·배포가 중단되지 않게 할 것.
2. **인코딩, HTML 정제 & 중복 방지 (Idempotency):**
   - 네이버 RSS 응답을 `ArrayBuffer`로 받아 UTF-8 / EUC-KR 인코딩을 자동 판별(`TextDecoder`)하고 HTML 태그를 정제할 것.
   - 기존 `src/content/posts/*.md`의 `sourceGuid` 및 `originalUrl`을 대조하여 이미 발행된 글 및 운영자 직접 작성 글은 건너뛰며, 1회 실행당 최대 5건 처리 및 요청 간 4초 딜레이로 Rate Limit을 방어할 것.
3. **네이버 이미지 핫링크(엑박) 차단 우회:**
   - `User-Agent`와 `Referer: https://cafe.naver.com/` 헤더 및 10초 타임아웃을 설정해 `public/images/rss/[해시파일명].[확장자]`로 로컬 저장하고, 실패 시 기본 감성 SVG 썸네일로 폴백할 것.
4. **Gemini API 개인정보 마스킹 · 할루시네이션 차단 · SEO 변환 (`@google/genai` SDK + `gemini-2.5-flash`):**
   - **개인정보 보호 가드레일 (필수):** 일반 회원의 실명, 휴대폰 번호, 계좌번호, 이메일, 상세 주소(동·호수) 등 민감 정보(PII)를 철저히 탐지하여 `[회원]` 또는 마스킹 처리하고 공식 단체/공개 운영 정보만 남길 것.
   - **할루시네이션 원천 차단 가드레일 (Strict Grounding 필수):** 짧은 RSS 요약문에 명시되지 않은 날짜, 시간, 장소, 회비, 준비물 등 구체적 사실을 절대 추측하거나 창작하지 말 것. 잘려서 확인되지 않는 세부 정보는 반드시 *"자세한 일정과 세부 내용은 하단의 네이버 카페 원문 공지에서 확인하실 수 있습니다."*로 안내할 것.
   - **대화형 AI 검색 제목 최적화 (필수):** 카페 내부용 짧은 제목을 외부 사용자가 ChatGPT나 Gemini에 질문할 법한 지역·맥락 키워드가 자연스럽게 포함된 제목으로 다듬을 것.
   - **JSON Schema 강제 출력 (`responseMimeType: "application/json"`, `responseSchema` 적용):** `cleanTitle`, `urlSlug` (영문 소문자·숫자·하이픈 3~6단어), `summary` (3문장 핵심 요약), `category`, `markdownBody`를 받아 `YYYY-MM-DD-[urlSlug].md`(`pinned: false`)로 저장하고, YAML Frontmatter 문자열은 `JSON.stringify()`로 안전하게 직렬화할 것.
5. **GitHub Actions 스마트 트리거 분리 및 루프 방지:**
   - `permissions`에 `contents: write`, `pages: write`, `id-token: write` 명시 및 `concurrency` 그룹 설정.
   - 트리거: `schedule` (매일 KST 오전 8시 `cron: '0 23 * * *'`), `workflow_dispatch`, `push` (`main` 브랜치).
   - **조건부 단계 분리 (디자인 변경 시 20초 초고속 반영):**
     - `sync-rss.mjs` 및 자동 `git commit & push` 단계는 **`github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'`일 때만 실행**하여, 운영자가 Pages CMS에서 계절 테마나 이벤트 배너를 바꾸거나 글을 수정(`push` 이벤트)했을 때는 RSS 수집을 건너뛰고 20초 내로 즉시 Astro 빌드 및 배포만 수행되도록 설계할 것.
     - 기본 `GITHUB_TOKEN` 푸시로 무한 루프를 차단하고, Astro 빌드 → `npx pagefind --site dist` → `actions/deploy-pages@v4` 배포 → 신규 URL 존재 시 `IndexNow` 핑 전송 순으로 마무리할 것.

---

# 7. Mandatory Self-Audit Checklist (코드 출력 전 15단계 자체 감사 게이트)
코드를 작성하면서 아래 15가지 항목을 스스로 전수 검사하고, 단 하나라도 위반되면 즉시 수정한 뒤 최종 코드를 출력하세요.

- [ ] **Check 1 (No Placeholders):** `// ... 생략`, `TODO` 같은 축약 코드가 단 한 줄도 없으며 즉시 `npm install && npm run build`가 성공하는가?
- [ ] **Check 2 (Zero-Edit `astro.config.mjs`):** 대괄호 플레이스홀더 없이 `GITHUB_REPOSITORY` 환경변수로 `site`와 `base`를 자동 계산하는가?
- [ ] **Check 3 (Tailwind v4 & CSS Theme Tokens):** 구형 `@astrojs/tailwind` 없이 `@tailwindcss/vite`를 사용했으며, 5가지 컬러 테마(`sage`, `blossom`, `terracotta`, `winter-navy`, `minimal-mono`), 히어로 스타일 3종, 폰트 전환 2종, 상단 이벤트 띠배너가 CSS 변수와 컴포넌트로 완벽히 동작하는가?
- [ ] **Check 4 (Default View Cache Sync):** 운영자가 CMS에서 `defaultViewMode`를 변경했을 때 기존 방문자의 `localStorage` 값 때문에 새 기본 모드가 무시되지 않도록 키 네이밍이나 초기화 로직을 처리했는가?
- [ ] **Check 5 (Astro v5 API Unity):** 구형 `entry.slug`나 `type: 'content'` 없이 최신 `src/content.config.ts` (`glob` 로더)와 `entry.id`로 전 구간 통일했는가?
- [ ] **Check 6 (Pinned Posts & `/about` Page):** 메인 피드에서 `pinned: true` 포스트가 최상단에 우선 고정 정렬되며, 영구 핵심 정보를 담은 `/about` 페이지와 `FAQPage` JSON-LD 스키마가 구현되었는가?
- [ ] **Check 7 (`llms.txt` Core Context Priority):** `llms.txt`와 `llms-full.txt` 최상단에 `about.json` 핵심 소개·FAQ(및 활성 이벤트 공지)와 고정 공지가 먼저 출력되고 `/about.md` 엔드포인트가 동작하는가?
- [ ] **Check 8 (Base URL & Image Path Safety):** 서브패스 배포(`/repo-name/`) 시 내부 링크(`/about`, 이벤트 배너 내부 링크 포함), Pagefind 번들 경로, Pages CMS 업로드 이미지(`/images/uploads/...`), `robots.txt` 사이트맵 주소가 모두 `withBase()`를 거치는가?
- [ ] **Check 9 (ASCII URL Slug & YAML Escape):** 자동 생성 파일명이 순수 영문/숫자(`YYYY-MM-DD-english-slug.md`)이며, Frontmatter 문자열이 `JSON.stringify()`로 안전하게 이스케이프되었는가?
- [ ] **Check 10 (Anti-Hallucination & PII Masking):** Gemini 시스템 프롬프트에 개인정보 마스킹과 함께 '짧은 RSS 원문에 없는 일정·장소·수치 창작 절대 금지' 규칙이 명시되었는가?
- [ ] **Check 11 (Empty IndexNow Route Safety):** `INDEXNOW_KEY` 미설정 시 `[indexnow].txt.ts`의 `getStaticPaths()`가 빈 배열(`[]`)을 반환하며, 설정 시 `keyLocation`에 전체 URL을 담아 전송하는가?
- [ ] **Check 12 (Pages CMS Full Design Control & `.nojekyll`):** `public/.nojekyll` 파일이 포함되었으며, `.pages.yml`에서 게시글(`pinned`), `/about` 페이지, 그리고 `siteConfig.json` 내 디자인 테마·이벤트 배너 드롭다운/스위치가 한글 라벨로 정확히 매핑되었는가?
- [ ] **Check 13 (Naver Image Hotlink & Encoding Defense):** EUC-KR/UTF-8 안전 디코딩과 `Referer` 헤더 포함 이미지 로컬 다운로드 및 테마 조화형 SVG 폴백이 구현되었는가?
- [ ] **Check 14 (Smart Workflow Separation):** GitHub Actions에서 Pages CMS 테마/콘텐츠 수정(`push`) 시에는 RSS 수집을 건너뛰고 20초 내 즉시 빌드만 수행하도록 `if` 조건이 분리되었는가?
- [ ] **Check 15 (Official Gemini SDK):** 최신 공식 `@google/genai` SDK(`new GoogleGenAI({ apiKey })`, `ai.models.generateContent`)와 `Type` 스키마를 정확히 사용했는가?

---

# 8. Output Deliverables & Post-Launch Alert Guide
아래 순서대로 전체 파일 코드와 운영 안내서를 생략 없이 출력해 주세요.

1. **전체 디렉터리 트리 구조**
2. **설정, 디자인 토큰 CSS 및 인프라 파일** (`package.json`, `astro.config.mjs`, `.pages.yml`, `public/.nojekyll`, `src/styles/global.css`, `src/pages/robots.txt.ts`)
3. **데이터 스키마, 글로벌·디자인 설정, 핵심 소개 데이터, 기본 SVG 썸네일 및 샘플 포스트 3개** (`src/content.config.ts`, `src/data/siteConfig.json`, `src/data/about.json`, `src/content/posts/*.md`)
4. **공통 유틸리티(`src/utils/url.ts`), 이벤트 배너·히어로 컴포넌트, 레이아웃 및 페이지** (`BaseLayout.astro`, `index.astro`, `about.astro`, `posts/[id].astro`)
5. **AI 전용 및 IndexNow 엔드포인트** (`src/pages/llms.txt.ts`, `src/pages/llms-full.txt.ts`, `src/pages/about.md.ts`, `src/pages/posts/[id].md.ts`, `src/pages/[indexnow].txt.ts`)
6. **RSS + Gemini + IndexNow 자동화 스크립트 및 GitHub Actions 워크플로우** (`scripts/sync-rss.mjs`, `.github/workflows/sync-and-deploy.yml`)
7. **자체 감사(Self-Audit) 15개 항목 통과 검증 요약표**
8. **비개발자 운영자를 위한 5단계 클릭형 초기 세팅 & 계절 테마 변경 매뉴얼** (GitHub 저장소 생성 → GitHub Pages `GitHub Actions` 소스 설정 → Secrets 등록 → Pages CMS에서 새 글·고정 공지·`/about` 편집 및 **1분 만에 계절 테마·이벤트 배너 바꾸는 법** + 60일 미활동 시 스케줄러 재가동 팁)
9. **🚨 [필수 알림] 사이트 개설 직후 AI 검색 노출 개통 체크리스트 (`POST_LAUNCH_CHECKLIST.md` 파일 생성 및 답변 하단 강조 출력):**
   - 운영자가 사이트 배포 직후 잊지 않고 수행할 수 있도록 프로젝트 루트에 `POST_LAUNCH_CHECKLIST.md` 파일을 포함하고, 답변 마지막에도 눈에 띄는 경고 박스 형태로 아래 4단계를 상세한 클릭 경로와 함께 안내할 것:
     - **Step 1 (외딴섬 방지 링크 연결):** 네이버 카페 대문/카페 소개글에 공식 웹 아카이브 주소 한 줄 삽입하기 (JSON-LD `sameAs`와 상호 검증 완성)
     - **Step 2 (Gemini·구글 AI 노출):** Google Search Console 속성 등록 및 `sitemap-index.xml` 제출 방법
     - **Step 3 (ChatGPT·코파일럿·퍼플렉시티 노출):** Bing Webmaster Tools 사이트 등록, 사이트맵 제출 및 `INDEXNOW_KEY` 발급·연결 방법
     - **Step 4 (네이버 웹문서 보강):** 네이버 서치어드바이저 사이트 및 사이트맵 등록 방법


