import { useState, FormEvent } from "react";
import type { TripAccess, JoinResult } from "../lib/access";
import { TRIP } from "../constants";

interface InviteGateProps {
  access: Extract<TripAccess, "needs-invite" | "offline" | "error">;
  onJoin: (inviteCode: string) => Promise<JoinResult>;
  onRetry: () => void;
}

const JOIN_ERROR_MESSAGES: Record<Exclude<JoinResult, "joined">, string> = {
  invalid: "초대 코드가 올바르지 않아요",
  rate_limited: "시도가 너무 많아요. 15분 후에 다시 시도해 주세요",
  error: "연결에 실패했어요. 잠시 후 다시 시도해 주세요",
};

const STATUS_MESSAGES: Record<"offline" | "error", string> = {
  offline: "처음 접속할 때는 인터넷 연결이 필요해요",
  error: "서버에 연결하지 못했어요",
};

export function InviteGate({ access, onJoin, onRetry }: InviteGateProps) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !code.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    const result = await onJoin(code);
    setSubmitting(false);
    if (result !== "joined") setErrorMsg(JOIN_ERROR_MESSAGES[result]);
  };

  return (
    <div
      className="relative mx-auto flex flex-col h-dvh overflow-hidden items-center justify-center"
      style={{ maxWidth: "390px", background: "#F2F4F6" }}
    >
      <div className="w-full px-8">
        <div className="text-center mb-10">
          <div className="text-[28px] font-bold text-text1 mb-2">{TRIP.title}</div>
          <div className="text-[14px] leading-[21px] text-text3">{TRIP.dateRange}</div>
        </div>

        {access === "needs-invite" ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label htmlFor="invite-code" className="text-[14px] leading-[21px] text-text2 text-center mb-2">
              공유받은 초대 코드를 입력해 주세요
            </label>
            <input
              id="invite-code"
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full py-4 px-5 bg-white rounded-2xl text-[16px] leading-[24px] text-text1 outline-none"
              style={{ outline: "0.5px solid #e5e7eb" }}
            />
            {errorMsg && (
              <div className="text-[13px] leading-[20px] text-center" style={{ color: "var(--color-danger)" }}>
                {errorMsg}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-full py-4 rounded-2xl text-[16px] leading-[24px] font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--color-action)" }}
            >
              {submitting ? "확인 중..." : "입장하기"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4 items-center">
            <div className="text-[14px] leading-[21px] text-text2 text-center">{STATUS_MESSAGES[access]}</div>
            <button
              type="button"
              onClick={onRetry}
              className="w-full py-4 bg-white rounded-2xl text-[16px] leading-[24px] font-semibold text-text1"
              style={{ outline: "0.5px solid #e5e7eb" }}
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
