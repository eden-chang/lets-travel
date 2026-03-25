import { MEMBERS, COLORS } from "../constants";
import { formatKRW } from "../utils";
import type { Settlement } from "../types";

interface SettleTabProps {
  settlement: Settlement;
}

const MEMBER_COLORS: Record<string, string> = {
  송: COLORS.action,
  약국: COLORS.negative,
  후뎅: COLORS.positive,
  나결: COLORS.deposit,
};

export function SettleTab({ settlement }: SettleTabProps) {
  const { totalKRW, perMember, remaining, remainCount } = settlement;

  if (totalKRW === 0) {
    return (
      <div className="px-5 pt-16 pb-16 text-center">
        <div className="text-[22px] leading-[31px] text-text4 mb-3">₩</div>
        <div className="text-[14px] leading-[21px] text-text2 mb-1">정산할 내역이 없어요</div>
        <div className="text-[12px] leading-[18px] text-text4">
          지출을 기록하면 자동으로 정산이 계산돼요
        </div>
      </div>
    );
  }

  // 각 사람별 보내야 할 / 받아야 할 정리
  const memberSummary = MEMBERS.map((m) => {
    const toSend = remaining.filter((r) => r.from === m);
    const toReceive = remaining.filter((r) => r.to === m);
    const sendTotal = toSend.reduce((s, r) => s + r.amount, 0);
    const receiveTotal = toReceive.reduce((s, r) => s + r.amount, 0);
    return { name: m, toSend, toReceive, sendTotal, receiveTotal, balance: perMember[m] };
  });

  return (
    <div className="flex flex-col gap-2 pt-1">
      {/* 제목 */}
      <div className="px-5 pt-2 pb-1 text-[24px] leading-[33px] text-text1" style={{ fontWeight: 800 }}>
        정산
      </div>

      {/* 정산 상태 요약 */}
      <div className="mx-4 bg-white rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] leading-[18px] text-text3">남은 정산</span>
          <span
            className="text-[12px] leading-[18px] font-semibold"
            style={{ color: remainCount === 0 ? COLORS.positive : COLORS.text3 }}
          >
            {remainCount === 0 ? "완료" : ""}
          </span>
        </div>
        {remainCount === 0 ? (
          <div className="text-[18px] leading-[27px] font-bold" style={{ color: COLORS.positive }}>
            모든 정산 완료 ✓
          </div>
        ) : (
          <div className="text-[22px] leading-[31px] font-bold" style={{ color: COLORS.negative }}>
            {formatKRW(remaining.reduce((s, r) => s + r.amount, 0))}원
          </div>
        )}
      </div>

      {/* 사람별 상세 */}
      {memberSummary.map((ms) => {
        const color = MEMBER_COLORS[ms.name] ?? COLORS.text3;
        const bal = perMember[ms.name];
        if (!bal) return null;
        const hasSend = ms.toSend.length > 0;
        const hasReceive = ms.toReceive.length > 0;
        if (!hasSend && !hasReceive && Math.abs(bal.balance) < 10) return null;

        return (
          <div key={ms.name} className="mx-4 bg-white rounded-2xl px-5 py-4">
            <div className="text-[15px] leading-[23px] font-bold text-text1 mb-3">{ms.name}</div>

            {/* 결제/소비 */}
            <div className="flex items-center justify-between py-[4px]">
              <span className="text-[13px] leading-[20px] text-text3">결제한 금액</span>
              <span className="text-[13px] leading-[20px] font-semibold text-text1">{formatKRW(bal.paid)}원</span>
            </div>
            <div className="flex items-center justify-between py-[4px]">
              <span className="text-[13px] leading-[20px] text-text3">소비한 금액</span>
              <span className="text-[13px] leading-[20px] font-semibold text-text1">{formatKRW(bal.owes)}원</span>
            </div>
            <div className="flex items-center justify-between py-[4px]">
              <span className="text-[13px] leading-[20px] text-text3">이미 보낸 금액</span>
              <span className="text-[13px] leading-[20px] font-semibold text-text1">{formatKRW(bal.transferred)}원</span>
            </div>

            {/* 구분선 + 정산 내역 */}
            {(hasSend || hasReceive) && (
              <div className="mt-2 pt-2 border-t border-[#f0f1f3]">
                {ms.toReceive.map((s, i) => (
                  <div key={`r${i}`} className="flex items-center justify-between py-[4px]">
                    <span className="text-[13px] leading-[20px] text-text2">{s.from}에게 받을 금액</span>
                    <span className="text-[13px] leading-[20px] font-semibold" style={{ color: COLORS.positive }}>
                      {formatKRW(s.amount)}원
                    </span>
                  </div>
                ))}
                {ms.toSend.map((s, i) => (
                  <div key={`s${i}`} className="flex items-center justify-between py-[4px]">
                    <span className="text-[13px] leading-[20px] text-text2">{s.to}에게 줄 금액</span>
                    <span className="text-[13px] leading-[20px] font-semibold" style={{ color: COLORS.negative }}>
                      {formatKRW(s.amount)}원
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!hasSend && !hasReceive && (
              <div className="mt-2 pt-2 border-t border-[#f0f1f3] text-[12px] leading-[18px]" style={{ color: COLORS.positive }}>
                정산 완료
              </div>
            )}
          </div>
        );
      })}

      <div className="h-2" />
    </div>
  );
}
