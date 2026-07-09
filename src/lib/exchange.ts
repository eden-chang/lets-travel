import { getMeta, setMeta } from "./idb";

/**
 * 환율 데이터 (KRW 기준)
 * frankfurter.app는 ECB 데이터를 제공하며 KRW 직접 지원
 */
export interface ExchangeRates {
  EUR: number;
  CZK: number;
  HUF: number;
  KRW: number;
  updatedAt: string;
}

// Fallback 환율 (2026년 7월 기준)
const FALLBACK_RATES: ExchangeRates = {
  EUR: 1740,
  CZK: 73,
  HUF: 4.85,
  KRW: 1,
  updatedAt: "",
};

const CACHE_KEY = "exchange_rates";

/**
 * Get today's date string in KST (yyyy-MM-dd)
 */
function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC+9
  return kst.toISOString().slice(0, 10);
}

/**
 * frankfurter.app에서 특정 날짜의 환율을 가져와 KRW 기준으로 변환
 * API는 유럽중앙은행(ECB)의 공식 일일 환율 데이터를 제공
 */
async function fetchFromAPI(): Promise<ExchangeRates | null> {
  try {
    // Get yesterday's date (ECB publishes rates with 1-day delay)
    const today = getTodayKST();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    // Try yesterday's rate first (most likely to succeed)
    let res = await fetch(
      `https://api.frankfurter.app/${dateStr}?from=KRW&to=EUR,CZK,HUF`
    );

    // If yesterday's rate not available, use latest
    if (!res.ok) {
      res = await fetch(
        "https://api.frankfurter.app/latest?from=KRW&to=EUR,CZK,HUF"
      );
    }

    if (!res.ok) return null;

    const data = await res.json();
    // API returns: { date: "2026-07-07", rates: { EUR: 0.000676, CZK: 0.01613, HUF: 0.263 } }
    // We need "1 EUR = X KRW" format, so invert
    const rates: ExchangeRates = {
      EUR: Math.round(1 / data.rates.EUR),
      CZK: Math.round((1 / data.rates.CZK) * 10) / 10,
      HUF: Math.round((1 / data.rates.HUF) * 100) / 100,
      KRW: 1,
      updatedAt: today, // Store as today's KST date
    };
    return rates;
  } catch {
    return null;
  }
}

/**
 * 캐시된 환율 로드
 */
async function loadCachedRates(): Promise<ExchangeRates | null> {
  try {
    const raw = await getMeta(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw as string) as ExchangeRates;
  } catch {
    return null;
  }
}

/**
 * 환율 캐시 저장
 */
async function saveCachedRates(rates: ExchangeRates): Promise<void> {
  await setMeta(CACHE_KEY, JSON.stringify(rates));
}

/**
 * 캐시가 유효한지 확인 (오늘 날짜와 비교)
 */
function isCacheValid(rates: ExchangeRates): boolean {
  if (!rates.updatedAt) return false;
  const today = getTodayKST();
  const cachedDate = rates.updatedAt.slice(0, 10); // Extract date part
  return cachedDate === today;
}

/**
 * 환율 가져오기 (캐시 우선, 만료 시 API 호출, 오프라인이면 캐시 반환)
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  // 1. 캐시 확인
  const cached = await loadCachedRates();
  if (cached && isCacheValid(cached)) {
    return cached;
  }

  // 2. 온라인이면 API 호출
  if (navigator.onLine) {
    const fresh = await fetchFromAPI();
    if (fresh) {
      await saveCachedRates(fresh);
      return fresh;
    }
  }

  // 3. 캐시가 만료됐지만 있으면 그래도 사용
  if (cached) {
    return cached;
  }

  // 4. 아무것도 없으면 폴백 사용
  return FALLBACK_RATES;
}

/**
 * 환율 표시 텍스트 (예: "1 EUR = 1,480원")
 */
export function formatRate(currency: string, rate: number): string {
  return `1 ${currency} = ${rate.toLocaleString("ko-KR")}원`;
}
