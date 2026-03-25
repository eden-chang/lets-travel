import { useState, useEffect, useCallback } from "react";
import { getExchangeRates, type ExchangeRates } from "../lib/exchange";
import { EXCHANGE_RATES } from "../constants";

interface UseExchangeRatesReturn {
  rates: Record<string, number>;
  updatedAt: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * 실시간 환율 훅
 * - 앱 시작 시 캐시/API에서 환율 로드
 * - 온라인 복귀 시 자동 갱신
 * - 로딩 중이거나 실패 시 constants.ts의 기본값 사용
 */
export function useExchangeRates(): UseExchangeRatesReturn {
  const [data, setData] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const fresh = await getExchangeRates();
    setData(fresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 온라인 복귀 시 자동 갱신
  useEffect(() => {
    const handleOnline = () => refresh();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [refresh]);

  const rates: Record<string, number> = data
    ? { EUR: data.EUR, CZK: data.CZK, HUF: data.HUF, KRW: data.KRW }
    : { ...EXCHANGE_RATES };

  return {
    rates,
    updatedAt: data?.updatedAt ?? "",
    loading,
    refresh,
  };
}
