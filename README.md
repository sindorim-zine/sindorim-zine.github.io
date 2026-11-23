# 신도림 커뮤니티 공식 웹 아카이브

네이버 카페 **'신도림 커뮤니티'** 의 주요 소식을 정리해 보여 주는 정적 웹사이트입니다.

- 사람에게는 계절·행사에 따라 분위기를 바꾸는 **따뜻한 로컬 웹진**
- 검색엔진·AI(ChatGPT, Gemini, Perplexity, 네이버)에게는 **구조화된 공식 원본 아카이브**
- 운영자는 코드를 고치지 않고 **Pages CMS(웹 관리자)** 에서 클릭만으로 글·소개·디자인을 관리합니다.

사이트 주소: **https://sindorim-zine.github.io/**

> 🚨 사이트를 처음 연 날에는 꼭 [POST_LAUNCH_CHECKLIST.md](POST_LAUNCH_CHECKLIST.md)의 4단계를 해 주세요. 이걸 해야 AI 검색에 노출되기 시작합니다.

---

## 📘 비개발자 운영자를 위한 5단계 매뉴얼

### 1단계. GitHub 저장소에 코드 올리기 (최초 1회)

저장소 `sindorim-zine/sindorim-zine.github.io`는 이미 만들어져 있습니다. 이 폴더의 코드를 올리면 됩니다.

PowerShell에서 이 폴더로 이동한 뒤 아래 두 명령을 차례로 실행합니다.

```powershell
git remote add origin https://github.com/sindorim-zine/sindorim-zine.github.io.git
```

```powershell
git push -u origin main
```

처음 실행하면 GitHub 로그인 창이 뜹니다. 브라우저에서 로그인(2단계 인증 포함)하면 업로드가 끝납니다.

### 2단계. GitHub Pages를 'GitHub Actions' 방식으로 켜기 (최초 1회)

1. GitHub 저장소 화면 → **Settings** → 왼쪽 메뉴 **Pages**
2. **Build and deployment** → **Source**를 **GitHub Actions**로 선택
3. 저장소 **Actions** 탭 → `Sync RSS & Deploy` → **Run workflow** 버튼 → 초록색 **Run workflow**
4. 1~2분 뒤 초록색 체크가 뜨면 https://sindorim-zine.github.io/ 에서 사이트가 보입니다.

> Actions 탭에 "Workflows aren't being run on this repository" 안내가 보이면 **I understand my workflows, go ahead and enable them**을 눌러 주세요.

### 3단계. 자동 수집용 비밀값(Secrets) 등록 (선택, 자동화를 쓸 때)

GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| 이름 (Name) | 값 | 없으면? |
|---|---|---|
| `NAVER_CAFE_RSS_URL` | 네이버 카페 RSS 주소. 여러 개면 콤마(`,`)로 구분 | RSS 자동 수집만 건너뜀 (사이트는 정상 배포) |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey 에서 발급한 키 | RSS 자동 수집만 건너뜀 |
| `INDEXNOW_KEY` | IndexNow 키 ([체크리스트 Step 3](POST_LAUNCH_CHECKLIST.md) 참고) | 검색엔진 즉시 알림만 건너뜀 |

- 비밀값이 하나도 없어도 사이트 빌드·배포는 **절대 실패하지 않습니다.** 필요한 것부터 천천히 등록하세요.
- **커스텀 도메인**(예: `sindorim.kr`)을 연결했다면 같은 화면의 **Variables** 탭에서 `SITE_URL` = `https://sindorim.kr` 을 추가하세요. 코드 수정은 필요 없습니다.
- 자동 수집은 **매일 오전 8시(한국 시간)** 에 실행되며, 한 번에 최대 5개 글을 가져옵니다. AI가 회원 개인정보(이름·전화번호·계좌 등)를 가리고, 원문에 없는 일정·장소·회비는 지어내지 않도록 설정되어 있습니다.
- RSS 주소 확인: 네이버 카페의 RSS 공개 여부와 주소는 카페 관리 메뉴에서 확인할 수 있습니다. 네이버 정책에 따라 메뉴 위치나 제공 여부가 바뀔 수 있으니, 주소를 찾기 어려우면 등록하지 않고 Pages CMS로 직접 글을 올려도 됩니다.

### 4단계. Pages CMS 연결 — 새 글·고정 공지·/about 편집

1. https://app.pagescms.org 접속 → **Sign in with GitHub**
2. 처음이면 GitHub 앱 설치 화면이 나옵니다 → `sindorim-zine.github.io` 저장소를 선택해 설치
3. 프로젝트 목록에서 `sindorim-zine/sindorim-zine.github.io` → 브랜치 `main` 선택

왼쪽 메뉴 세 가지로 모든 관리를 합니다.

| 메뉴 | 할 수 있는 일 |
|---|---|
| **게시글 관리 (새 글 작성 및 상단 고정)** | **+ Add an entry** → 제목·작성일·카테고리·AI 3줄 요약·썸네일·카페 원문 URL·본문 입력 → **Save** |
| **커뮤니티 핵심 소개 (/about) 편집** | 소개 문구, 핵심 활동, 연혁, FAQ 수정 |
| **사이트 디자인 테마 · 이벤트 배너 · 기본 설정** | 계절 테마, 배너, 사이트 이름, 카페 주소 등 |

- **상단 고정 공지**: 글 편집 화면에서 `상단 고정 (📌 중요 안내)` 스위치를 켜면 메인 화면 맨 위에 항상 보입니다.
- **임시 저장**: `비공개 (임시 저장)`을 켜 두면 사이트에 공개되지 않습니다.
- **파일 이름**: 새 글을 만들 때 파일 이름 칸이 보입니다. 이 이름이 글 주소(URL)가 됩니다. `2026-12-01-year-end-party`처럼 **영문 소문자·숫자·하이픈**으로 고쳐 주면 좋고, 기본값 그대로 둬도 됩니다.
- 저장하면 GitHub Actions가 자동으로 사이트를 다시 만들어 **약 1~2분 뒤** 반영됩니다. (이때는 RSS 수집을 건너뛰고 빌드·배포만 하므로 가장 빠르게 반영됩니다)

### 5단계. ⏱ 1분 만에 계절 테마·이벤트 배너 바꾸기

**Pages CMS → 사이트 디자인 테마 · 이벤트 배너 · 기본 설정** 에서:

1. **🎨 디자인 테마**
   - **컬러 테마**: `도림천 세이지 (기본)` / `봄날 벚꽃 웜톤` / `가을 브런치 테라코타` / `연말 네이비 골드` / `모던 미니멀 모노톤`
   - **메인 상단 배너 스타일**: `감성 카드형` / `와이드 이미지 강조형` / `미니멀 글자형`
   - **제목 서체**: `감성 명조체` / `깔끔한 고딕체`
   - **첫 화면 글 목록 보기 방식**: `포토 그리드` / `에세이 리스트`
2. **📣 특별 이벤트 상단 배너**
   - `배너 켜기` 스위치를 켜고, 배지 문구(`EVENT`, `D-7` 등)·안내 문구·버튼 텍스트·이동 링크를 입력
   - 이동 링크는 사이트 안이면 `/about`처럼, 외부면 `https://`로 시작하게 쓰면 자동으로 구분됩니다.
3. **Save** → 1~2분 뒤 사이트 전체 분위기가 바뀝니다.

**추천 조합**

| 시즌 | 컬러 테마 | 배너 스타일 | 제목 서체 |
|---|---|---|---|
| 봄 (3~5월) | 봄날 벚꽃 웜톤 | 감성 카드형 | 감성 명조체 |
| 여름·평상시 | 도림천 세이지 | 감성 카드형 | 감성 명조체 |
| 가을 (9~11월) | 가을 브런치 테라코타 | 미니멀 글자형 | 감성 명조체 |
| 연말·송년회 | 연말 네이비 골드 | 와이드 이미지 강조형 + 이벤트 배너 | 깔끔한 고딕체 |
| 공식 발표·정돈된 느낌 | 모던 미니멀 모노톤 | 미니멀 글자형 | 깔끔한 고딕체 |

> 방문자가 '그리드/리스트' 버튼으로 보기 방식을 바꾼 기록은 브라우저에 저장됩니다. 운영자가 기본 보기 방식을 바꾸면 기존 방문자에게도 **새 기본 화면이 먼저** 보이도록 처리되어 있습니다.

---

## 💡 운영 팁

### 60일 동안 활동이 없으면 자동 수집이 멈춰요
GitHub는 **60일 동안 저장소에 변경이 없으면** 예약 실행(매일 오전 8시 수집)을 자동으로 꺼 버립니다.
- 다시 켜기: 저장소 **Actions** 탭 → 왼쪽 `Sync RSS & Deploy` → 노란 안내 막대의 **Enable workflow** 클릭
- 미리 막기: 한 달에 한 번쯤 Pages CMS에서 글이나 설정을 저장하면 자동으로 연장됩니다. RSS로 새 글이 자동 커밋되는 동안에도 연장됩니다.

### 카테고리를 새로 추가하고 싶다면
1. Pages CMS → 기본 설정 → **카테고리 목록**에 새 이름 추가 (메인 화면 탭 순서)
2. Pages CMS 글 작성 화면의 카테고리 선택지는 `.pages.yml` 파일에 적혀 있습니다. GitHub 저장소 웹 화면에서 `.pages.yml`을 열고 연필(✏️) 아이콘 → `values: [공지사항, 모임·행사, ...]` 줄에 같은 이름을 추가 → **Commit changes**
   (Pages CMS가 선택지를 다른 파일에서 읽어오는 기능을 지원하지 않아 이 한 줄만 직접 고쳐야 합니다)

### 메인 배너 이미지 바꾸기
기본 설정 → **메인 배너 이미지**에서 사진을 올리세요. JPG/PNG 사진을 올리면 카카오톡·SNS 공유 미리보기에도 그 사진이 쓰입니다.

### 무엇을 고치면 안 되나요?
`src/`, `scripts/`, `.github/` 폴더의 코드는 고칠 필요가 없습니다. 모든 운영은 Pages CMS에서 합니다.

---

## ✅ 자체 감사(Self-Audit) 15개 항목 검증 결과

빌드·실행으로 직접 확인한 결과와, 별도 QA 에이전트의 독립 검증 결과를 합친 표입니다. (2026-11-23 기준)

| # | 항목 | 결과 | 근거 |
|---|---|---|---|
| 1 | 축약 코드 없음, `npm install && npm run build` 성공 | ✅ | `astro build` + `pagefind` 경고 없이 통과, TODO·생략 표시 없음 |
| 2 | `astro.config.mjs` 무수정 주소 자동 계산 | ✅ | 루트 저장소(`/`), 일반 저장소(`/repo`), `SITE_URL` 커스텀 도메인, 로컬 폴백 4가지 빌드 확인 |
| 3 | Tailwind v4 + 테마 토큰, 테마 5종·히어로 3종·서체 2종·이벤트 배너 | ✅ | `@tailwindcss/vite` 사용, 모든 조합에서 `data-*` 속성과 마크업 확인. 글자·버튼에는 대비 4.5:1 이상인 `--accent-ink` 적용 |
| 4 | 기본 보기 모드 캐시 동기화 | ✅ | 저장 키 `sindorim-view-pref-${defaultViewMode}` + 화면 그리기 전 실행되는 인라인 스크립트 |
| 5 | Astro 최신 API 통일 | ✅ | `src/content.config.ts` + `glob` 로더 + `entry.id`, 구형 `type: 'content'`·`entry.slug` 없음 |
| 6 | 고정글 최상단, `/about` + `FAQPage` | ✅ | 📌 중요 안내 영역이 피드 위에 고정, `/about/`에 AboutPage·FAQPage(4문항)·BreadcrumbList |
| 7 | `llms.txt` 핵심 맥락 우선, `/about.md` | ✅ | 소개 → (이벤트 공지) → 활동·연혁·FAQ → 고정 공지 → 최신 글 순서, `.md` 미러 생성 |
| 8 | base 경로·이미지 경로 안전 | ✅ | 서브패스 빌드에서 내부 링크 98/98개 정상, 게시글 본문 속 `/images/uploads/...`·내부 링크도 마크다운 플러그인으로 보정 |
| 9 | 영문 슬러그 파일명, YAML 이스케이프 | ✅ | `YYYY-MM-DD-english-slug.md`, Frontmatter `JSON.stringify` (모의 Gemini로 생성 확인) |
| 10 | 사실 창작 금지 + 개인정보 마스킹 | ✅ | 시스템 프롬프트 규칙 + 정규식 2차 필터(날짜·금액·URL 숫자는 보존하도록 보정) |
| 11 | 빈 IndexNow 키 안전, `keyLocation` 전체 URL | ✅ | 키 없으면 키 파일 미생성·빌드 통과, 키 있으면 `/키.txt` 생성, `keyLocation`에 서브패스 포함 |
| 12 | Pages CMS 디자인 제어, `.nojekyll` | ✅ | `about.json`·`siteConfig.json`의 모든 키가 CMS 필드와 일치(프로그램으로 대조), 한글 라벨 드롭다운 |
| 13 | 네이버 이미지 핫링크·인코딩 방어 | ✅ | UTF-8·EUC-KR 피드 디코딩 확인, `Referer`·10초 타임아웃 이미지 저장, 실패 시 테마색 SVG 일러스트 |
| 14 | 워크플로 스마트 분리 | ✅ | RSS 수집·자동 커밋은 예약·수동 실행 때만, CMS 저장(push)은 빌드·배포만 |
| 15 | 공식 Gemini SDK | ✅ | `new GoogleGenAI({ apiKey })`, `ai.models.generateContent`, `Type`, `responseMimeType`·`responseSchema` |

**실제 GitHub에서만 확인 가능한 항목**: GitHub Actions 실행·Pages 배포, 실제 Gemini 응답 품질, IndexNow 실제 접수, Pages CMS 화면 동작. 첫 배포 후 확인이 필요합니다.

**스펙과 다르게 구현한 점**
- **Astro 7** 사용: 스펙의 "Astro v5+"에 해당하며, 그 때문에 GitHub Actions는 Node 24로 실행합니다.
- **반영 시간**: 스펙은 "20초 내 반영"이지만, 실제로는 의존성 설치·빌드·검색 색인·배포까지 **약 1~2분**이 걸립니다. RSS 수집을 건너뛰는 분리는 그대로 적용했습니다.
- **카테고리 선택지**: Pages CMS가 다른 파일에서 선택지를 읽지 못해 `.pages.yml`에 한 번 더 적어야 합니다(위 운영 팁 참고).

---

## 🛠 개발자용 정보

### 로컬 실행
```powershell
npm install
```
```powershell
npm run dev
```
`http://localhost:4321` 에서 확인합니다. 검색(Pagefind)까지 확인하려면 `npm run build` 후 `npm run preview`를 씁니다.

### 기술 스택
- Astro 7 (`output: 'static'`, `src/content.config.ts` + `glob` 로더 + `entry.id`)
- Tailwind CSS v4 + `@tailwindcss/vite` (구형 `@astrojs/tailwind` 미사용)
- Pagefind 한국어 정적 검색, `@astrojs/sitemap`
- Pages CMS (`.pages.yml`)
- Node.js 24, `rss-parser`, `@google/genai` (`gemini-2.5-flash`), IndexNow
- GitHub Actions → GitHub Pages

### 사이트 주소 자동 감지
`astro.config.mjs`는 직접 수정하지 않습니다. `scripts/site-url.mjs`가 다음 순서로 계산합니다.
1. `SITE_URL` (커스텀 도메인) → 2. `GITHUB_REPOSITORY` (`owner.github.io` 저장소면 base `/`, 아니면 `/저장소이름`) → 3. 로컬 `http://localhost:4321`

### 디렉터리 구조
```
.
├── .github/workflows/sync-and-deploy.yml   # 수집(예약·수동) / 빌드·배포(항상) / IndexNow
├── .pages.yml                               # Pages CMS 관리 화면 정의
├── astro.config.mjs                         # site·base 자동 감지, sitemap, Tailwind v4
├── public/
│   ├── .nojekyll
│   ├── favicon.svg
│   └── images/
│       ├── hero-default.svg                 # 기본 메인 배너 그림
│       ├── og-default.png                   # 기본 SNS 공유 이미지
│       ├── rss/                             # RSS 이미지 로컬 저장 (핫링크 차단 우회)
│       └── uploads/                         # Pages CMS 업로드 이미지
├── scripts/
│   ├── site-url.mjs                         # 주소 자동 계산 (config·스크립트 공용)
│   ├── sync-rss.mjs                         # 네이버 RSS → Gemini → posts/*.md
│   ├── markdown-base-path.mjs               # 본문 속 링크·이미지에 base 경로 적용
│   └── indexnow-ping.mjs                    # IndexNow 즉시 색인 요청
└── src/
    ├── content.config.ts                    # 게시글 스키마 (Zod)
    ├── content/posts/*.md                   # 게시글
    ├── data/
    │   ├── siteConfig.json                  # 사이트·디자인·이벤트 배너 설정
    │   └── about.json                       # /about 소개·연혁·FAQ
    ├── styles/global.css                    # 디자인 토큰 + 테마 5종
    ├── utils/                               # url(withBase)·site·schema(JSON-LD)·markdown
    ├── components/                          # EventBanner, Hero(3종), PostCard, SearchModal, Illustration …
    ├── layouts/BaseLayout.astro             # 메타태그·OG·theme-color·폰트·보기 모드
    └── pages/
        ├── index.astro                      # 히어로 + 📌 고정글 + 카테고리 탭 + 피드
        ├── about.astro                      # 소개·핵심 활동·연혁·FAQ·카페 CTA
        ├── posts/[id].astro                 # 상세 (AI 3줄 요약 + 카페 원문 CTA)
        ├── posts/[id].md.ts, about.md.ts    # 순수 마크다운 미러
        ├── llms.txt.ts, llms-full.txt.ts    # AI 크롤러용 문서
        ├── robots.txt.ts                    # AI 봇 명시 허용 + 사이트맵
        └── [indexnow].txt.ts                # IndexNow 키 파일 (키 없으면 미생성)
```
