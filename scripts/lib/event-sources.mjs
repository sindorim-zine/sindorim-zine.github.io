// 외부 행사 자동 수집기 — 공식 공개 데이터(공공 API)만 사용합니다.
// 다른 사이트의 화면을 긁어 오지(스크래핑) 않습니다. 팝업스토어처럼 API가 없는 소식은 운영진 제보로 받습니다.
//
// 키(GitHub Secrets)가 없는 출처는 조용히 건너뜁니다. 하나도 없으면 자동 수집 없이 제보만 동작합니다.
//   SEOUL_API_KEY  서울 열린데이터광장 일반 인증키 → ① 서울시 문화행사 정보 ② 서울시 공공서비스예약(문화체험)
//   TOUR_API_KEY   공공데이터포털(data.go.kr) 한국관광공사 국문 관광정보 서비스 인증키 → ③ 전국 축제
//   KOPIS_API_KEY  공연예술통합전산망 OpenAPI 인증키 → ④ 공연
//
// 확인일 2026-11-24: ①② 실제 호출로 필드 확인, ③ KorService2/searchFestival2(지역 필터는 lDongRegnCd),
// ④ XML 전용. ③④의 일부 응답 필드는 공식 문서로 확인하지 못해, 값이 없어도 깨지지 않게 방어적으로 읽습니다.

import { createHash } from 'node:crypto';

const TIMEOUT_MS = 20000;
// 신도림에서 가까운 곳일수록 앞에 보여 줍니다(멀다고 빼지는 않습니다 — 신도림은 전국으로 가는 교통의 요지).
const NEAR_GU = ['구로구', '영등포구', '양천구', '금천구', '동작구', '강서구', '마포구', '광명'];
const WINDOW_DAYS = 30; // 오늘부터 30일 안에 시작하는(또는 접수가 끝나는) 행사만
const SEOUL_ROWS = Number(process.env.SEOUL_API_ROWS) || 1000; // 시험용(sample 키는 5건까지)

// 공공 API가 HTML 기호(&lt; &middot; 등)를 그대로 보내는 경우가 있어 글자로 바꿔 둡니다.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—' };
const decode = (t) =>
  t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
const s = (v) => (v == null ? '' : decode(decode(String(v))).trim()); // &amp;lt; 같은 이중 표기까지
// '5000' → '5,000원' (숫자만 온 요금)
const won = (t) => (/^\d[\d,]*$/.test(t) ? `${Number(t.replaceAll(',', '')).toLocaleString('ko-KR')}원` : t);
const hash = (v) => createHash('sha1').update(String(v)).digest('hex').slice(0, 10);

/** '2027-02-12 00:00:00.0' · '20270212' · '2027.02.12' → '2027-02-12' */
function toDay(v) {
  const m = /(\d{4})[-.]?(\d{2})[-.]?(\d{2})/.exec(s(v));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function getText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json, application/xml;q=0.9, */*;q=0.5' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function getJson(url) {
  const text = await getText(url);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`JSON이 아닌 응답: ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
  }
}

/** 주소(키 포함)를 로그에 남기지 않도록 오류 메시지만 정리 */
const why = (error) => s(error?.message || error).replace(/[A-Za-z0-9%]{24,}/g, '***').slice(0, 160);

function nearScore(text) {
  const t = s(text);
  if (NEAR_GU.some((g) => t.includes(g))) return 3;
  if (/서울/.test(t)) return 2;
  if (/경기|인천/.test(t)) return 1;
  return 0;
}

function lines(pairs) {
  return pairs
    .filter(([, v]) => s(v))
    .map(([k, v]) => `- ${k}: ${s(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`)
    .join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// ① 서울시 문화행사 정보 (서울 열린데이터광장 OA-15486, 공공누리 제1유형)
//    DATE 필터는 '시작일이 이 글자로 시작하는' 행사를 돌려줍니다 → 이번 달·다음 달을 각각 조회
// ─────────────────────────────────────────────────────────────────────────
async function seoulCulture({ key, today, until }) {
  const months = [...new Set([today.slice(0, 7), until.slice(0, 7)])];
  const rows = [];
  for (const month of months) {
    const data = await getJson(`http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/culturalEventInfo/1/${SEOUL_ROWS}/%20/%20/${month}`);
    const code = data?.culturalEventInfo?.RESULT?.CODE ?? data?.RESULT?.CODE;
    if (code && code !== 'INFO-000') {
      if (code === 'INFO-200') continue; // 해당 데이터 없음
      throw new Error(`${code} ${s(data?.culturalEventInfo?.RESULT?.MESSAGE ?? data?.RESULT?.MESSAGE)}`);
    }
    rows.push(...(data?.culturalEventInfo?.row ?? []));
  }
  return rows
    .map((r) => {
      const start = toDay(r.STRTDATE);
      const end = toDay(r.END_DATE);
      const url = s(r.HMPG_ADDR) || s(r.ORG_LINK);
      const cult = /cultcode=(\d+)/.exec(url)?.[1];
      const category = s(r.CODENAME);
      const free = s(r.IS_FREE) === '무료';
      return {
        sourceId: `seoul-culture:${cult || hash(`${r.TITLE}|${start}|${r.PLACE}`)}`,
        sourceName: '서울 열린데이터광장 · 서울시 문화행사 정보 (공공누리 제1유형)',
        title: s(r.TITLE),
        eventDate: start,
        eventEndDate: end && end > start ? end : '',
        eventLabel: end && end > start ? '행사 기간' : '행사일',
        eventLocation: [s(r.GUNAME), s(r.PLACE)].filter(Boolean).join(' '),
        organizer: s(r.ORG_NAME) === '기타' ? '' : s(r.ORG_NAME),
        feeInfo: won(s(r.USE_FEE) || s(r.IS_FREE)),
        originalUrl: url,
        body: lines([
          ['분류', category],
          ['행사명', r.TITLE],
          ['기간', s(r.DATE) || [start, end].filter(Boolean).join(' ~ ')],
          ['시간', r.PRO_TIME],
          ['장소', `${s(r.GUNAME)} ${s(r.PLACE)}`],
          ['대상', r.USE_TRGT],
          ['요금', s(r.USE_FEE) || s(r.IS_FREE)],
          ['주최', s(r.ORG_NAME) === '기타' ? '' : r.ORG_NAME],
          ['문의', r.INQUIRY],
          ['공식 안내', url],
        ]),
        _start: start,
        _score: nearScore(r.GUNAME) + (free ? 1 : 0) + (/축제/.test(category) ? 2 : /교육|체험/.test(category) ? 1 : 0),
      };
    })
    .filter((e) => e.title && e._start && e._start > today && e._start <= until);
}

// ─────────────────────────────────────────────────────────────────────────
// ② 서울시 공공서비스예약 — 문화체험 (OA-2271): 공공기관 체험·교육 프로그램 접수
//    회원이 미리 알아야 하는 날짜는 '접수 마감'이므로 그 날짜를 행사 날짜로 씁니다.
// ─────────────────────────────────────────────────────────────────────────
async function seoulReservation({ key, today, until }) {
  const data = await getJson(`http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/ListPublicReservationCulture/1/${SEOUL_ROWS}/`);
  const code = data?.ListPublicReservationCulture?.RESULT?.CODE ?? data?.RESULT?.CODE;
  if (code && code !== 'INFO-000' && code !== 'INFO-200') throw new Error(`${code} ${s(data?.RESULT?.MESSAGE)}`);
  const soon = addDays(today, 14);
  return (data?.ListPublicReservationCulture?.row ?? [])
    .map((r) => {
      const rcptStart = toDay(r.RCPTBGNDT);
      const rcptEnd = toDay(r.RCPTENDDT);
      const svcStart = toDay(r.SVCOPNBGNDT);
      const svcEnd = toDay(r.SVCOPNENDDT);
      const url = s(r.SVCURL) || (s(r.SVCID) ? `https://yeyak.seoul.go.kr/web/reservation/selectReservView.do?rsv_svc_id=${encodeURIComponent(s(r.SVCID))}` : '');
      const free = s(r.PAYATNM) === '무료';
      const place = s(r.PLACENM);
      return {
        sourceId: `seoul-yeyak:${s(r.SVCID) || hash(`${r.SVCNM}|${rcptEnd}`)}`,
        sourceName: '서울 열린데이터광장 · 서울시 공공서비스예약 정보',
        title: s(r.SVCNM),
        eventDate: rcptEnd,
        eventEndDate: '',
        eventLabel: '접수 마감',
        eventLocation: [s(r.AREANM), place.split('>').pop()].filter(Boolean).join(' '),
        organizer: place.includes('>') ? place.split('>')[0].trim() : '',
        feeInfo: s(r.PAYATNM),
        originalUrl: url,
        body: lines([
          ['분류', [r.MAXCLASSNM, r.MINCLASSNM].filter(Boolean).join(' / ')],
          ['프로그램', r.SVCNM],
          ['접수 상태', r.SVCSTATNM],
          ['접수 기간', [rcptStart, rcptEnd].filter(Boolean).join(' ~ ')],
          ['이용 기간', [svcStart, svcEnd].filter(Boolean).join(' ~ ')],
          ['장소', `${s(r.AREANM)} ${place}`],
          ['대상', r.USETGTINFO],
          ['요금', r.PAYATNM],
          ['예약·신청', url],
        ]),
        _start: rcptEnd,
        _status: s(r.SVCSTATNM),
        _rcptStart: rcptStart,
        _score: nearScore(r.AREANM) + (free ? 1 : 0),
      };
    })
    .filter((e) => e.title && e._start && e._start >= addDays(today, 2) && e._start <= until)
    // 지금 접수 중이거나 2주 안에 접수가 시작되는 프로그램만
    .filter((e) => /접수중/.test(e._status) || (e._rcptStart && e._rcptStart >= today && e._rcptStart <= soon));
}

// ─────────────────────────────────────────────────────────────────────────
// ③ 한국관광공사 TourAPI 국문 관광정보 KorService2 — 행사·축제 (전국)
// ─────────────────────────────────────────────────────────────────────────
async function tourFestival({ key, today, until }) {
  const base = 'https://apis.data.go.kr/B551011/KorService2';
  const common = `serviceKey=${encodeURIComponent(key)}&MobileOS=ETC&MobileApp=SindorimCommunity&_type=json`;
  const data = await getJson(`${base}/searchFestival2?${common}&numOfRows=300&pageNo=1&arrange=A&eventStartDate=${today.replaceAll('-', '')}`);
  const header = data?.response?.header;
  if (header?.resultCode && header.resultCode !== '0000') throw new Error(`${header.resultCode} ${s(header.resultMsg)}`);
  let items = data?.response?.body?.items?.item ?? [];
  if (!Array.isArray(items)) items = items ? [items] : [];
  const picked = items
    .map((r) => {
      const start = toDay(r.eventstartdate);
      const end = toDay(r.eventenddate);
      const addr = [s(r.addr1), s(r.addr2)].filter(Boolean).join(' ');
      return {
        sourceId: `tour-festival:${s(r.contentid) || hash(`${r.title}|${start}`)}`,
        sourceName: '한국관광공사 TourAPI · 전국 행사·축제 정보',
        title: s(r.title),
        eventDate: start,
        eventEndDate: end && end > start ? end : '',
        eventLabel: end && end !== start ? '축제 기간' : '축제일',
        eventLocation: addr,
        organizer: '',
        feeInfo: '',
        originalUrl: '',
        body: lines([
          ['축제명', r.title],
          ['기간', [start, end].filter(Boolean).join(' ~ ')],
          ['주소', addr],
          ['문의 전화', r.tel],
        ]),
        _contentId: s(r.contentid),
        _start: start,
        _score: nearScore(addr) + 2,
      };
    })
    .filter((e) => e.title && e._start && e._start > today && e._start <= until);
  return picked;
}

/** TourAPI 상세(공통·소개)에서 홈페이지·주최·요금을 보충합니다. 실패해도 목록 정보만으로 후보를 만듭니다. */
async function enrichTour(item, key) {
  if (!item._contentId) return item;
  const base = 'https://apis.data.go.kr/B551011/KorService2';
  const common = `serviceKey=${encodeURIComponent(key)}&MobileOS=ETC&MobileApp=SindorimCommunity&_type=json&contentId=${encodeURIComponent(item._contentId)}`;
  const first = (data) => {
    const it = data?.response?.body?.items?.item;
    return Array.isArray(it) ? it[0] : it;
  };
  try {
    const c = first(await getJson(`${base}/detailCommon2?${common}`));
    const href = /href=["']([^"']+)["']/i.exec(s(c?.homepage))?.[1] || (/^https?:\/\//.test(s(c?.homepage)) ? s(c?.homepage) : '');
    if (href) item.originalUrl = href;
    if (s(c?.overview)) item.body += `\n- 소개: ${s(c.overview).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1200)}`;
  } catch {}
  try {
    const d = first(await getJson(`${base}/detailIntro2?${common}&contentTypeId=15`));
    if (s(d?.sponsor1)) item.organizer = s(d.sponsor1).replace(/<[^>]+>/g, ' ').trim().slice(0, 80);
    if (s(d?.usetimefestival)) item.feeInfo = s(d.usetimefestival).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (s(d?.eventplace)) item.eventLocation = s(d.eventplace).replace(/<[^>]+>/g, ' ').trim().slice(0, 60) || item.eventLocation;
    if (!item.originalUrl) item.originalUrl = /href=["']([^"']+)["']/i.exec(s(d?.eventhomepage))?.[1] || '';
    item.body += `\n${lines([['주최', d?.sponsor1], ['장소', d?.eventplace], ['요금', d?.usetimefestival], ['시간', d?.playtime]])}`;
  } catch {}
  return item;
}

// ─────────────────────────────────────────────────────────────────────────
// ④ KOPIS 공연예술통합전산망 — 서울·경기 공연 예정작 (XML 전용)
// ─────────────────────────────────────────────────────────────────────────
const xmlTag = (xml, tag) => s(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`).exec(xml)?.[1]);

async function kopis({ key, today, until }) {
  const st = today.replaceAll('-', '');
  const ed = until.replaceAll('-', '');
  const out = [];
  for (const area of ['11', '41']) {
    const xml = await getText(`https://kopis.or.kr/openApi/restful/pblprfr?service=${encodeURIComponent(key)}&stdate=${st}&eddate=${ed}&cpage=1&rows=100&prfstate=01&signgucode=${area}`);
    if (/<returncode>|<errmsg>|INVALID|SERVICE_KEY/i.test(xml) && !/<db>/.test(xml)) throw new Error(xmlTag(xml, 'errmsg') || xml.slice(0, 120));
    for (const block of xml.match(/<db>[\s\S]*?<\/db>/g) ?? []) {
      const start = toDay(xmlTag(block, 'prfpdfrom'));
      const end = toDay(xmlTag(block, 'prfpdto'));
      const place = xmlTag(block, 'fcltynm');
      const id = xmlTag(block, 'mt20id');
      out.push({
        sourceId: `kopis:${id || hash(`${xmlTag(block, 'prfnm')}|${start}`)}`,
        sourceName: '(재)예술경영지원센터 공연예술통합전산망(KOPIS)',
        title: xmlTag(block, 'prfnm'),
        eventDate: start,
        eventEndDate: end && end > start ? end : '',
        eventLabel: end && end !== start ? '공연 기간' : '공연일',
        eventLocation: place,
        organizer: '',
        feeInfo: '',
        originalUrl: '',
        body: lines([
          ['공연명', xmlTag(block, 'prfnm')],
          ['장르', xmlTag(block, 'genrenm')],
          ['기간', [start, end].filter(Boolean).join(' ~ ')],
          ['공연장', place],
          ['지역', xmlTag(block, 'area')],
        ]),
        _id: id,
        _start: start,
        _score: nearScore(`${xmlTag(block, 'area')} ${place}`),
      });
    }
  }
  return out.filter((e) => e.title && e._start && e._start > today && e._start <= until);
}

async function enrichKopis(item, key) {
  if (!item._id) return item;
  try {
    const xml = await getText(`https://kopis.or.kr/openApi/restful/pblprfr/${encodeURIComponent(item._id)}?service=${encodeURIComponent(key)}`);
    const price = xmlTag(xml, 'pcseguidance');
    const org = xmlTag(xml, 'entrpsnm') || xmlTag(xml, 'entrpsnmH') || xmlTag(xml, 'entrpsnmP');
    const link = /<relateurl>(?:<!\[CDATA\[)?([^<\]]+)/.exec(xml)?.[1]?.trim() ?? '';
    if (price) item.feeInfo = price.slice(0, 80);
    if (org) item.organizer = org.slice(0, 80);
    if (/^https?:\/\//.test(link)) item.originalUrl = link;
    item.body += `\n${lines([['관람료', price], ['주최·기획', org], ['관람 연령', xmlTag(xml, 'prfage')], ['공연 시간', xmlTag(xml, 'dtguidance')], ['예매·안내', link]])}`;
  } catch {}
  return item;
}

// ─────────────────────────────────────────────────────────────────────────
// 출처별로 골고루 고르기
// ─────────────────────────────────────────────────────────────────────────
const SOURCES = [
  { name: '서울시 문화행사', env: 'SEOUL_API_KEY', run: seoulCulture, quota: 5 },
  { name: '전국 축제(TourAPI)', env: 'TOUR_API_KEY', run: tourFestival, quota: 4, enrich: enrichTour },
  { name: '공공서비스예약', env: 'SEOUL_API_KEY', run: seoulReservation, quota: 2 },
  { name: '공연(KOPIS)', env: 'KOPIS_API_KEY', run: kopis, quota: 1, enrich: enrichKopis },
];

/**
 * @param {{ today: string, log: Function, limit: number, isKnown: (item:any)=>boolean }} opts
 * @returns {Promise<Array<Record<string,string>>>} 후보 목록 (frontmatter 값 + body)
 */
export async function collectEvents({ today, log, limit, isKnown }) {
  if (limit <= 0) return [];
  const until = addDays(today, WINDOW_DAYS);
  const pools = [];
  for (const source of SOURCES) {
    const key = s(process.env[source.env]);
    if (!key) {
      log(`  ${source.name}: ${source.env} 키가 없어 건너뜀`);
      continue;
    }
    try {
      const seenTitles = new Set();
      const items = (await source.run({ key, today, until }))
        .filter((e) => !isKnown(e))
        // 같은 프로그램이 회차별로 여러 줄 나오는 경우 제목 기준으로 한 번만 (가장 가까운 날짜)
        .sort((a, b) => a._start.localeCompare(b._start))
        .filter((e) => {
          const k = e.title.replace(/\s+/g, ' ');
          if (seenTitles.has(k)) return false;
          seenTitles.add(k);
          return true;
        })
        .sort((a, b) => b._score - a._score || a._start.localeCompare(b._start));
      log(`  ${source.name}: 새 후보 ${items.length}건`);
      pools.push({ ...source, key, items });
    } catch (error) {
      log(`  ${source.name}: 수집 실패(건너뜀) — ${why(error)}`);
    }
  }

  // 출처별 할당량만큼 먼저 고르고, 남는 자리는 차례로 채웁니다.
  const picked = [];
  for (const pool of pools) picked.push(...pool.items.splice(0, pool.quota).map((item) => ({ pool, item })));
  while (picked.length < limit && pools.some((p) => p.items.length)) {
    for (const pool of pools) if (pool.items.length && picked.length < limit) picked.push({ pool, item: pool.items.shift() });
  }

  const result = [];
  for (const { pool, item } of picked.slice(0, limit)) {
    const full = pool.enrich ? await pool.enrich(item, pool.key) : item;
    result.push(
      Object.fromEntries(Object.entries(full).filter(([k, v]) => !k.startsWith('_') && v !== '' && v != null)),
    );
  }
  return result;
}
