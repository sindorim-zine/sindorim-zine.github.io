# 🚨 사이트 개설 직후 AI 검색 노출 개통 체크리스트

> 사이트가 처음 배포된 날, 아래 4단계를 **한 번만** 해 두면 ChatGPT·Gemini·Perplexity·네이버가 이 사이트를 "신도림 커뮤니티의 공식 출처"로 인식하기 시작합니다.
> 사이트 주소: **https://sindorim-zine.github.io/** (커스텀 도메인을 연결했다면 그 주소)

---

## ☐ Step 1. 외딴섬 방지 — 네이버 카페에 웹 아카이브 주소 걸기

검색엔진은 "카페 → 웹사이트", "웹사이트 → 카페"가 **서로 가리키고 있을 때** 둘이 같은 단체라고 확신합니다. 웹사이트 쪽 연결(JSON-LD `sameAs`)은 자동으로 들어가 있으니, 카페 쪽 연결만 해 주면 됩니다.

1. **Pages CMS** → `사이트 디자인 테마 · 이벤트 배너 · 기본 설정` → **네이버 카페 주소**에 `https://cafe.naver.com/카페아이디`를 넣고 저장합니다. (이 값이 있어야 `sameAs`와 '카페 가입하기' 버튼이 켜집니다)
2. 네이버 카페 → **카페 관리** → **카페 운영 → 카페 정보**(또는 대문 꾸미기)로 이동합니다.
3. 카페 소개글이나 대문에 다음 한 줄을 넣습니다.
   `📚 신도림 커뮤니티 공식 웹 아카이브: https://sindorim-zine.github.io/`
4. 저장한 뒤, 카페 첫 화면에서 링크가 눌리는지 확인합니다.

> 메뉴 이름은 네이버 카페 개편에 따라 조금 다를 수 있습니다. '카페 소개' 또는 '대문'을 편집할 수 있는 곳이면 됩니다.

---

## ☑ Step 2. Gemini·구글 AI 노출 — Google Search Console (소유 확인 완료)

1. https://search.google.com/search-console 접속 → 구글 계정으로 로그인
2. **속성 추가** → 오른쪽 **URL 접두어** 선택 → `https://sindorim-zine.github.io/` 입력 → 계속
3. 소유권 확인 방법 중 **HTML 태그**(`<meta name="google-site-verification" content="...">` 한 줄) 또는 **HTML 파일**(`google-site-verification: googleXXXX.html`) 중 아무거나 고릅니다.
4. 그 값을 그대로 복사 → **Pages CMS → 🎨 디자인 테마 · 이벤트 배너 · 기본 설정 → 🔎 검색엔진 소유 확인 코드 → Google** 칸에 붙여 넣고 **Save**
   - HTML 파일 방식이면 파일을 내려받아 올릴 필요 없이, 사이트가 같은 이름의 확인 파일을 자동으로 만들어 줍니다.
5. 2분 뒤 Search Console에서 **확인** 클릭 → "소유권이 확인됨" ✅ *(2026-11-23 완료)*
6. 왼쪽 메뉴 **Sitemaps** → `sitemap-index.xml` 입력 → **제출**
7. 왼쪽 메뉴 **URL 검사** → 홈 주소, `/about/`, `/archive/` 주소를 넣고 **색인 생성 요청**을 누릅니다.

> 구글 색인은 보통 며칠~2주 걸립니다. 기다리는 동안 따로 할 일은 없습니다.

---

## ☐ Step 3. ChatGPT·코파일럿·퍼플렉시티 노출 — Bing Webmaster Tools + IndexNow

ChatGPT 검색과 Microsoft Copilot은 Bing 색인을 크게 활용합니다.

1. https://www.bing.com/webmasters 접속 → Microsoft 계정(또는 구글 계정)으로 로그인
2. **Google Search Console에서 가져오기**를 누르면 Step 2에서 등록한 사이트와 사이트맵을 그대로 불러옵니다. (가져오기를 안 쓰면: **사이트 추가** → 주소 입력 → 사이트맵 `https://sindorim-zine.github.io/sitemap-index.xml` 제출)
3. **IndexNow 키 연결** ✅ *(2026-11-23 완료 — 따로 할 일 없음)*
   - 키는 Pages CMS 기본 설정의 **IndexNow 키** 칸에 들어 있고, 확인 파일 `https://sindorim-zine.github.io/6f8c03a94c6f954ff9f0f2b62d5627de.txt`가 배포되어 있습니다. (공개되는 값이라 비밀이 아닙니다)
   - 기존 글 전체를 한 번 전송했고, 이후 새 글·수정한 글은 배포할 때마다 자동으로 전송됩니다. (Bing·네이버·Yandex 등 IndexNow 참여 검색엔진에 함께 전달)
   - 키를 바꾸고 싶으면 CMS의 IndexNow 키 칸에 영문·숫자 8~128자 값을 넣고 저장하면 됩니다.

---

## ☐ Step 4. 네이버 웹문서 보강 — 네이버 서치어드바이저

1. https://searchadvisor.naver.com 접속 → 네이버 로그인 → **웹마스터 도구**
2. 사이트 주소 `https://sindorim-zine.github.io` 입력 → **추가**
3. 소유 확인: **HTML 태그**(`<meta name="naver-site-verification" ...>`) 또는 **HTML 파일**(`naverXXXX.html`) 값을 **Pages CMS → 🔎 검색엔진 소유 확인 코드 → 네이버** 칸에 붙여 넣고 Save → 2분 뒤 **소유확인** 클릭
4. 사이트 선택 → **요청** → **사이트맵 제출** → `https://sindorim-zine.github.io/sitemap-index.xml` 입력 → 확인
5. **요청** → **웹 페이지 수집** → 홈 주소와 `/about/` 주소 수집 요청
6. (선택) **검증** → **robots.txt**에서 수집 허용 상태를 확인합니다. 이 사이트의 robots.txt는 네이버 로봇(Yeti)을 명시적으로 허용합니다.

---

## ✅ 다 끝냈다면 — 잘 되었는지 확인하는 법

| 확인 주소 | 정상일 때 |
|---|---|
| `https://sindorim-zine.github.io/robots.txt` | `GPTBot`, `ClaudeBot`, `Yeti` 등이 `Allow: /`로 보임 |
| `https://sindorim-zine.github.io/llms.txt` | 커뮤니티 소개 → FAQ → 중요 공지 → 최신 글 순서의 텍스트 |
| `https://sindorim-zine.github.io/sitemap-index.xml` | XML 사이트맵 |
| `https://search.google.com/test/rich-results` 에 `/about/` 주소 입력 | **FAQ** 항목이 감지됨 |

2~4주 뒤 ChatGPT나 Perplexity에 *"신도림 커뮤니티가 뭐야?"* 라고 물었을 때 이 사이트가 출처로 나오면 성공입니다.
