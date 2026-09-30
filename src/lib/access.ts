import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type TripAccess = "local-only" | "checking" | "needs-invite" | "member" | "offline" | "error";
export type JoinResult = "joined" | "invalid" | "rate_limited" | "error";

const MEMBER_CACHE_KEY = "tripMemberUserId";

function getCachedMemberId(): string | null {
  return localStorage.getItem(MEMBER_CACHE_KEY);
}

function cacheMember(userId: string): void {
  localStorage.setItem(MEMBER_CACHE_KEY, userId);
}

function clearCachedMember(): void {
  localStorage.removeItem(MEMBER_CACHE_KEY);
}

async function fetchOrCreateSessionUserId(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.error("Supabase getSession failed:", error.message);
    return null;
  }
  if (data.session) return data.session.user.id;

  const signIn = await client.auth.signInAnonymously();
  if (signIn.error || !signIn.data.user) {
    console.error("Supabase anonymous sign-in failed:", signIn.error?.message ?? "no user returned");
    return null;
  }
  return signIn.data.user.id;
}

// 동시에 여러 번 호출돼도 익명 사용자가 하나만 생성되도록 진행 중인 요청을 공유
let sessionRequest: Promise<string | null> | null = null;

function ensureSessionUserId(client: SupabaseClient): Promise<string | null> {
  if (!sessionRequest) {
    sessionRequest = fetchOrCreateSessionUserId(client).finally(() => {
      sessionRequest = null;
    });
  }
  return sessionRequest;
}

/** 재연결 시 동기화 전에 세션(만료된 토큰 포함)을 갱신한다. */
export async function refreshSession(): Promise<boolean> {
  if (!supabase) return false;
  return (await ensureSessionUserId(supabase)) !== null;
}

export async function resolveTripAccess(): Promise<TripAccess> {
  if (!supabase) return "local-only";

  const cachedId = getCachedMemberId();
  if (!navigator.onLine) return cachedId ? "member" : "offline";

  // 네트워크가 불안정해도 이미 합류한 기기는 로컬 데이터를 계속 쓸 수 있어야 함 (권한은 서버 RLS가 판단)
  const fallback: TripAccess = cachedId ? "member" : "error";

  const userId = await ensureSessionUserId(supabase);
  if (!userId) return fallback;

  const { data, error } = await supabase.rpc("is_trip_member");
  if (error) {
    console.error("Trip membership check failed:", error.message);
    return fallback;
  }
  if (data !== true) {
    clearCachedMember();
    return "needs-invite";
  }

  cacheMember(userId);
  return "member";
}

export async function joinTrip(inviteCode: string): Promise<JoinResult> {
  if (!supabase) return "error";

  const code = inviteCode.trim();
  if (!code) return "invalid";

  const userId = await ensureSessionUserId(supabase);
  if (!userId) return "error";

  const { data, error } = await supabase.rpc("join_trip", { invite_code: code });
  if (error) {
    console.error("Joining trip failed:", error.message);
    return "error";
  }
  if (data === "joined") {
    cacheMember(userId);
    return "joined";
  }
  if (data === "invalid" || data === "rate_limited") return data;

  console.error("Joining trip returned an unexpected result:", data);
  return "error";
}
