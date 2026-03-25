import { useState, useMemo } from "react";
import { DAY_NAMES, COLORS } from "../constants";
import { formatKRW } from "../utils";
import { Confirm } from "./Confirm";
import { Icon } from "./Icon";
import type { Transfer } from "../types";

interface TransferTabProps {
  transfers: Transfer[];
  saveTransfer: (item: Transfer) => void;
  deleteTransfer: (id: string) => void;
  onToast: (msg: string) => void;
  onAdd: () => void;
  onEdit: (t: Transfer) => void;
}

type FilterType = "전체" | "settlement" | "deposit" | "cash_exchange";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "전체", label: "전체" },
  { key: "settlement", label: "정산" },
  { key: "deposit", label: "선입금" },
  { key: "cash_exchange", label: "현금" },
];

export function TransferTab({
  transfers,
  saveTransfer,
  deleteTransfer,
  onToast,
  onAdd,
  onEdit,
}: TransferTabProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("전체");

  const filtered = useMemo(
    () => filter === "전체" ? transfers : transfers.filter((t) => t.type === filter),
    [transfers, filter]
  );

  const totalKRW = useMemo(() => filtered.reduce((s, t) => s + t.amount, 0), [filtered]);

  const grouped = useMemo(() => {
    const map: Record<string, Transfer[]> = {};
    filtered.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return map;
  }, [filtered]);

  const sortedDates = useMemo(
    () => Object.keys(grouped).sort().reverse(),
    [grouped]
  );

  return (
    <div className="flex flex-col gap-2 pt-1">
      {/* 삭제 확인 */}
      {confirmId && (
        <Confirm
          msg="이 송금 내역을 삭제할까요?"
          onOk={() => { deleteTransfer(confirmId); setConfirmId(null); onToast("삭제했어요"); }}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* 제목 */}
      <div className="px-5 pt-2 pb-1 text-[24px] leading-[33px] text-text1" style={{ fontWeight: 800 }}>
        송금 내역
      </div>

      {/* 요약 + 필터 */}
      <div className="mx-4 bg-white rounded-2xl px-5 py-4">
        <div className="text-[12px] leading-[18px] text-text3 mb-1">
          송금 {filtered.length}건
        </div>
        <div className="text-[22px] leading-[31px] font-bold text-text1 mb-3">
          {formatKRW(totalKRW)}원
        </div>
        {/* 필터 */}
        <div className="flex gap-[4px] pt-3 border-t border-[#f0f1f3]">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-1 py-[6px] rounded-lg text-[12px] leading-[18px] font-medium transition-colors flex items-center justify-center ${active ? "bg-text1 text-white" : "bg-[#f2f3f7] text-text3"
                  }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 빈 상태 */}
      {transfers.length === 0 ? (
        <div className="px-5 pt-16 pb-16 text-center">
          <div className="flex justify-center text-text4 mb-3">
            <Icon name="send" variant="line" size={36} />
          </div>
          <div className="text-[14px] leading-[21px] text-text2 mb-1">송금 내역이 없어요</div>
          <div className="text-[12px] leading-[18px] text-text4">
            선입금이나 정산 송금을 추가해 보세요
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mx-4 bg-white rounded-2xl px-5 py-8 text-center">
          <div className="text-[12px] leading-[18px] text-text4">
            해당 유형의 내역이 없어요
          </div>
        </div>
      ) : (
        /* 날짜별 그룹 카드 */
        sortedDates.map((date) => {
          const d = new Date(date + "T00:00:00");
          const dayIdx = d.getDay();
          const isSat = dayIdx === 6;
          const isSun = dayIdx === 0;
          const dayTotal = grouped[date].reduce((s, t) => s + t.amount, 0);

          return (
            <div key={date} className="mx-4 bg-white rounded-2xl overflow-hidden">
              {/* 날짜 헤더 */}
              <div className="flex justify-between items-center px-4 pt-3 pb-2">
                <span className="text-[13px] leading-[20px] font-bold text-text1">
                  {date.slice(5).replace("-", "/")}{" "}
                  <span
                    className="font-normal"
                    style={{ color: "#8b95a1" }}
                  >
                    {DAY_NAMES[dayIdx]}
                  </span>
                </span>
                <span className="tabular-nums text-[11px] leading-[17px] font-semibold text-text3">
                  {formatKRW(dayTotal)}원
                </span>
              </div>

              {/* 송금 항목 */}
              {grouped[date].map((t, idx) => {
                const color = t.type === "deposit" ? COLORS.deposit : t.type === "cash_exchange" ? COLORS.positive : COLORS.action;
                return (
                  <div key={t.id}>
                    {idx > 0 && <div className="mx-4 border-t border-[#f0f1f3]" />}
                    <button
                      type="button"
                      onClick={() => onEdit(t)}
                      className="w-full text-left active:bg-[#f8f8fa] transition-colors"
                    >
                      <div className="py-3 px-4 flex items-center gap-3">
                        {/* 내용 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-[6px]">
                            <span
                              className="text-[11px] leading-[17px] font-bold px-[6px] py-[1px] rounded-[6px] shrink-0"
                              style={{ background: `${color}12`, color }}
                            >
                              {t.type === "deposit" ? "선입금" : t.type === "cash_exchange" ? "현금" : "정산"}
                            </span>
                            <span className="text-[14px] leading-[21px] font-semibold text-text1 truncate">
                              {t.from} → {t.to}
                            </span>
                          </div>
                          {t.memo && (
                            <div className="text-[11px] leading-[17px] text-text4 mt-[2px] truncate">
                              {t.memo}
                            </div>
                          )}
                        </div>

                        {/* 금액 */}
                        <div className="text-right shrink-0">
                          <div className="text-[15px] leading-[23px] font-bold" style={{ color }}>
                            {t.currency && t.currency !== "KRW"
                              ? `${t.amount.toLocaleString()} ${t.currency}`
                              : `${formatKRW(t.amount)}원`
                            }
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      <div className="h-2" />
    </div>
  );
}
