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
3. 저장소 **Actions** 탭 → `Publish & Deploy` → **Run workflow** 버튼 → 초록색 **Run workflow**
4. 1~2분 뒤 초록색 체크가 뜨면 https://sindorim-zine.github.io/ 에서 사이트가 보입니다.

> Actions 탭에 "Workflows aren't being run on this repository" 안내가 보이면 **I understand my workflows, go ahead and enable them**을 눌러 주세요.

### 3단계. AI 키(Secrets) 등록 — '카페 글 올리기'를 쓰려면 필요

GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| 이름 (Name) | 값 | 없으면? |
|---|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey 에서 발급한 키 (`AIza…`로 시작) | '카페 글 올리기' 항목이 발행되지 않고 **처리 상태**에 "AI 키 미등록"이 표시됨 |
| `INDEXNOW_KEY` | IndexNow 키 ([체크리스트 Step 3](POST_LAUNCH_CHECKLIST.md) 참고) | 검색엔진 즉시 알림만 건너뜀 |

- 비밀값이 하나도 없어도 사이트 빌드·배포는 **절대 실패하지 않습니다.**
- AI 키가 없을 때 발행을 멈추는 이유: 회원 **이름**은 AI만 가릴 수 있어서, 키 없이 올리면 이름이 그대로 노출될 수 있기 때문입니다. 키를 등록한 뒤 해당 항목을 다시 저장하면(또는 다음 날 아침 8시) 자동으로 처리됩니다.
- **커스텀 도메인**(예: `sindorim.kr`)을 연결했다면 같은 화면의 **Variables** 탭에서 `SITE_URL` = `https://sindorim.kr` 을 추가하세요. 코드 수정은 필요 없습니다.

> **왜 RSS 자동 수집이 아닌가요?** 네이버 카페 RSS 서비스는 현재 제공되지 않고(`cafe.rss.naver.com` 주소 없음), 네이버 검색 API는 약관상 검색 결과의 저장·가공이 금지되어 있습니다. 또 카페에 하루 수십 건의 글이 올라오므로, **운영진이 고른 글만 붙여 넣으면 AI가 정리하는 방식**이 가장 안전하고 편리합니다.

### 4단계. Pages CMS로 운영하기

1. https://app.pagescms.org 접속 → **Sign in with GitHub**
2. 처음이면 GitHub 앱 설치 화면이 나옵니다 → **Only select repositories** → `sindorim-zine.github.io` 선택 → Install
3. 프로젝트 목록에서 `sindorim-zine/sindorim-zine.github.io` → 브랜치 `main` 선택

왼쪽 메뉴 네 가지로 모든 관리를 합니다.

| 메뉴 | 할 수 있는 일 |
|---|---|
| **✨ 카페 글 올리기** (가장 많이 씀) | 카페 글 주소 + 본문 붙여넣기 → **Save**. AI가 제목·3줄 요약·개인정보 가림·카테고리를 처리해 1~2분 뒤 사이트에 발행 |
| **📚 발행된 글 관리** | 올라간 글 수정, 📌 고정/해제, 비공개 전환, 직접 새 글 쓰기 |
| **🏡 커뮤니티 소개 페이지 (/about) 편집** | 소개 문구, 핵심 활동, 연혁, FAQ 수정 |
| **🎨 디자인 테마 · 이벤트 배너 · 기본 설정** | 계절 테마, 배너, 사이트 이름, 카페 주소 등 |

#### ✨ 카페 글 올리기 — 30초 사용법
1. 네이버 카페에서 올릴 글을 엽니다.
2. 주소창의 주소를 복사 → CMS **① 카페 글 주소**에 붙여넣기
3. 글 본문을 마우스로 드래그(또는 **Ctrl+A**)해 **Ctrl+C** → CMS **② 카페 글 내용 붙여넣기 (사진 포함)**에 **Ctrl+V**
   - **글 속 사진도 함께 붙여 넣어집니다.** 저장하면 사진을 우리 저장소로 자동으로 내려받아 원래 위치에 넣어 줍니다. (네이버 사진은 다른 사이트에서 바로 띄우면 차단되기 때문에 직접 저장합니다)
   - 첫 번째 사진이 자동으로 대표 사진(썸네일)이 됩니다.
4. (선택) 붙여 넣기로 사진이 안 들어갔다면 **③ 사진 추가**에서 1~5장을 직접 올리세요.
5. (선택) 제목·카테고리·📌 고정·공개 방식은 비워 두면 AI와 기본값이 알아서 처리합니다.
6. **Save** → 1~2분 뒤 사이트에서 확인

- **같은 카페 글 주소로 다시 올리면** 새 글이 추가되지 않고 기존 글이 새 내용으로 바뀝니다. (카페에서 공지를 수정했을 때 편리)
- **내용을 먼저 확인하고 싶으면** 공개 방식을 `비공개로 저장`으로 고르세요. 발행된 글 관리에서 확인한 뒤 `비공개` 스위치를 끄면 공개됩니다.
- 저장한 항목은 처리되면 목록에서 사라집니다. **목록에 계속 남아 있으면** 그 항목을 열어 **처리 상태**에 적힌 이유를 확인하세요.
- AI는 원문에 없는 날짜·장소·회비를 지어내지 않도록 설정되어 있지만, 중요한 공지는 발행 후 한 번 읽어 보시길 권합니다.

#### 📚 발행된 글 관리
- **상단 고정 공지**: `상단 고정 (📌 중요 안내)` 스위치를 켜면 메인 화면 맨 위에 항상 보입니다.
- **비공개 전환**: `비공개 (임시 저장)`을 켜면 사이트에서 내려갑니다.
- 저장하면 **약 1~2분 뒤** 사이트에 반영됩니다.

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

### 60일 동안 활동이 없으면 아침 자동 재시도가 멈춰요
GitHub는 **60일 동안 저장소에 변경이 없으면** 예약 실행(매일 오전 8시 수집)을 자동으로 꺼 버립니다.
- 다시 켜기: 저장소 **Actions** 탭 → 왼쪽 `Publish & Deploy` → 노란 안내 막대의 **Enable workflow** 클릭
- CMS에서 저장할 때 실행되는 배포는 이와 상관없이 항상 동작합니다. 한 달에 한 번쯤 CMS에서 저장하면 예약 실행도 자동으로 연장됩니다.

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
| 13 | 네이버 이미지 핫링크·인코딩 방어 | ➖ (해당 없음) | RSS를 쓰지 않게 되어 제거. 사진은 운영자가 CMS로 직접 올리고, 없으면 테마색 SVG 일러스트 |
| 14 | 워크플로 스마트 분리 | ✅ (변경) | RSS 대신 '카페 글 올리기' 항목이 있을 때만 AI 정리·자동 커밋, 없으면 바로 빌드·배포 (실측 약 35초) |
| 15 | 공식 Gemini SDK | ✅ | `new GoogleGenAI({ apiKey })`, `ai.models.generateContent`, `Type`, `responseMimeType`·`responseSchema` |

**실제 GitHub에서만 확인 가능한 항목**: GitHub Actions 실행·Pages 배포, 실제 Gemini 응답 품질, IndexNow 실제 접수, Pages CMS 화면 동작. 첫 배포 후 확인이 필요합니다.

**스펙과 다르게 구현한 점**
- **Astro 7** 사용: 스펙의 "Astro v5+"에 해당하며, 그 때문에 GitHub Actions는 Node 24로 실행합니다.
- **반영 시간**: 스펙은 "20초 내 반영"이지만, 실측 배포 시간은 약 35초~1분입니다.
- **RSS 자동 수집 → 카페 글 올리기(반자동)로 변경**: 네이버 카페 RSS 서비스가 제공되지 않고, 네이버 검색 API는 약관상 결과 저장·가공이 금지되어 있어서 바꿨습니다. Gemini 정리·개인정보 가림·사실 창작 금지 규칙은 그대로 적용됩니다.
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
- Node.js 24, `@google/genai` (`gemini-2.5-flash`), `yaml`, IndexNow
- GitHub Actions → GitHub Pages

### 사이트 주소 자동 감지
`astro.config.mjs`는 직접 수정하지 않습니다. `scripts/site-url.mjs`가 다음 순서로 계산합니다.
1. `SITE_URL` (커스텀 도메인) → 2. `GITHUB_REPOSITORY` (`owner.github.io` 저장소면 base `/`, 아니면 `/저장소이름`) → 3. 로컬 `http://localhost:4321`

### 디렉터리 구조
```
.
├── .github/workflows/sync-and-deploy.yml   # 카페 글 AI 정리 → 빌드·배포 → IndexNow
├── .pages.yml                               # Pages CMS 관리 화면 정의
├── astro.config.mjs                         # site·base 자동 감지, sitemap, Tailwind v4
├── public/
│   ├── .nojekyll
│   ├── favicon.svg
│   └── images/
│       ├── hero-default.svg                 # 기본 메인 배너 그림
│       ├── og-default.png                   # 기본 SNS 공유 이미지
│       └── uploads/                         # Pages CMS 업로드 이미지
├── scripts/
│   ├── site-url.mjs                         # 주소 자동 계산 (config·스크립트 공용)
│   ├── process-inbox.mjs                    # ✨ 카페 글 올리기: src/inbox → Gemini 정리 → posts/*.md
│   ├── lib/ai-writer.mjs                    # Gemini 호출·개인정보 가림·슬러그·Frontmatter 공용 모듈
│   ├── lib/body-images.mjs                  # 붙여 넣은 사진 내려받기·원래 위치 복원
│   ├── markdown-base-path.mjs               # 본문 속 링크·이미지에 base 경로 적용
│   └── indexnow-ping.mjs                    # IndexNow 즉시 색인 요청
└── src/
    ├── content.config.ts                    # 게시글 스키마 (Zod)
    ├── content/posts/*.md                   # 게시글
    ├── inbox/*.md                           # ✨ 카페 글 올리기 대기함 (처리되면 자동 삭제)
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
