import { rateLimitedFetch } from '../fetch-document.mjs';

const CNINFO_ORIGIN = 'https://www.cninfo.com.cn';
const CNINFO_STATIC = 'http://static.cninfo.com.cn';

/** @param {string} stockCode @param {string} orgId @param {'sse' | 'szse'} column */
async function queryAnnualAnnouncements(stockCode, orgId, column) {
  const body = new URLSearchParams({
    stock: `${stockCode},${orgId}`,
    tabName: 'fulltext',
    pageSize: '10',
    pageNum: '1',
    column,
    category: 'category_ndbg_szsh',
    plate: '',
    seDate: '2020-01-01~2030-12-31',
    searchkey: '',
    secid: '',
    sortName: '',
    sortType: '',
    isHLtitle: 'true',
  });

  const res = await rateLimitedFetch(`${CNINFO_ORIGIN}/new/hisAnnouncement/query`, {
    referer: `${CNINFO_ORIGIN}/`,
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: CNINFO_ORIGIN,
    },
    body: body.toString(),
  });
  const json = await res.json();
  return json.announcements ?? [];
}

/** @param {string} keyword */
export async function searchCninfoStock(keyword) {
  const body = new URLSearchParams({ keyWord: keyword, maxNum: '10' });
  const res = await rateLimitedFetch(`${CNINFO_ORIGIN}/new/information/topSearch/query`, {
    referer: `${CNINFO_ORIGIN}/`,
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: CNINFO_ORIGIN,
    },
    body: body.toString(),
  });
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

/** @param {string} localTicker */
export function stockCodeFromTicker(localTicker) {
  return String(localTicker ?? '').split('.')[0];
}

/** @param {string} listingRegime */
export function cninfoColumnForRegime(listingRegime) {
  return listingRegime === 'CN-SSE' ? 'sse' : 'szse';
}

/**
 * Pick the latest full annual report (skip summaries / English versions).
 * @param {Array<{ announcementTitle?: string, adjunctUrl?: string, announcementTime?: string }>} items
 */
export function pickCninfoAnnualReport(items) {
  const candidates = items.filter((it) => {
    const title = String(it.announcementTitle ?? '');
    if (!it.adjunctUrl) return false;
    if (/摘要|英文|取消/.test(title)) return false;
    if (!/年度报告/.test(title) && !/年年度报告/.test(title)) return false;
    return true;
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => String(b.announcementTime).localeCompare(String(a.announcementTime)));
  return candidates[0];
}

/**
 * @param {import('./registry.mjs').InternationalMiner} company
 * @returns {Promise<{ type: 'pdf', url: string, label: string, referer: string }[]>}
 */
export async function discoverCninfoFilingSources(company) {
  const stockCode = stockCodeFromTicker(company.localTicker);
  if (!stockCode) return [];

  const matches = await searchCninfoStock(stockCode);
  const match = matches.find((m) => m.code === stockCode) ?? matches[0];
  if (!match?.orgId) return [];

  const column = cninfoColumnForRegime(company.listingRegime);
  const announcements = await queryAnnualAnnouncements(stockCode, match.orgId, column);
  const pick = pickCninfoAnnualReport(announcements);
  if (!pick?.adjunctUrl) return [];

  const path = pick.adjunctUrl.startsWith('/') ? pick.adjunctUrl : `/${pick.adjunctUrl}`;
  return [
    {
      type: 'pdf',
      url: `${CNINFO_STATIC}${path}`,
      label: `CNINFO: ${pick.announcementTitle}`,
      referer: `${CNINFO_ORIGIN}/`,
    },
  ];
}
