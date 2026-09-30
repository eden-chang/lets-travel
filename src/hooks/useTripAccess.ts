import { useState, useEffect, useCallback } from "react";
import { resolveTripAccess, joinTrip } from "../lib/access";
import type { TripAccess, JoinResult } from "../lib/access";
import { isSupabaseConfigured } from "../lib/supabase";

interface UseTripAccessReturn {
  access: TripAccess;
  join: (inviteCode: string) => Promise<JoinResult>;
  retry: () => Promise<void>;
}

export function useTripAccess(): UseTripAccessReturn {
  const [access, setAccess] = useState<TripAccess>(() =>
    isSupabaseConfigured() ? "checking" : "local-only"
  );

  const retry = useCallback(async (): Promise<void> => {
    setAccess("checking");
    setAccess(await resolveTripAccess());
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    resolveTripAccess().then((result) => {
      if (!cancelled) setAccess(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const join = useCallback(async (inviteCode: string): Promise<JoinResult> => {
    const result = await joinTrip(inviteCode);
    if (result === "joined") setAccess("member");
    return result;
  }, []);

  return { access, join, retry };
}
