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

const FALLBACK_RATES: ExchangeRates = {
  EUR: 1480,
  CZK: 62,
  HUF: 3.8,
  KRW: 1,
  updatedAt: "",
};

const CACHE_KEY = "exchange_rates";
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6시간

/**
 * frankfurter.app에서 EUR 기준 환율을 가져와 KRW 기준으로 변환
 */
async function fetchFromAPI(): Promise<ExchangeRates | null> {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=KRW&to=EUR,CZK,HUF"
    );
    if (!res.ok) return null;

    const data = await res.json();
    // API returns: { rates: { EUR: 0.000676, CZK: 0.01613, HUF: 0.263 } }
    // We need "1 EUR = X KRW" format, so invert
    const rates: ExchangeRates = {
      EUR: Math.round(1 / data.rates.EUR),
      CZK: Math.round((1 / data.rates.CZK) * 10) / 10,
      HUF: Math.round((1 / data.rates.HUF) * 100) / 100,
      KRW: 1,
      updatedAt: new Date().toISOString(),
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
 * 캐시가 유효한지 확인
 */
function isCacheValid(rates: ExchangeRates): boolean {
  if (!rates.updatedAt) return false;
  const age = Date.now() - new Date(rates.updatedAt).getTime();
  return age < CACHE_MAX_AGE_MS;
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
