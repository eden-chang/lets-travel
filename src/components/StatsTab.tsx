import { useState, useMemo } from "react";
import { MEMBERS, CATEGORY_COLORS, CATEGORY_ICONS, DAY_NAMES } from "../constants";
import { formatKRW } from "../utils";
import { Icon } from "./Icon";
import type { Expense } from "../types";

interface StatsTabProps {
  settlement: { totalKRW: number; perMember: Record<string, { paid: number }>; byCategory: Record<string, number>; byCity: Record<string, number> };
  expenses: Expense[];
  currentUser?: string;
}

const EXCLUDED_CATS = ["항공", "숙박"];

export function StatsTab({ settlement, expenses, currentUser }: StatsTabProps) {
  const [includeBigItems, setIncludeBigItems] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  const filtered = useMemo(() => {
    let list = expenses;
    if (!includeBigItems) list = list.filter((e) => !EXCLUDED_CATS.includes(e.category));
    if (onlyMine && currentUser) list = list.filter((e) => e.members.includes(currentUser));
    return list;
  }, [expenses, includeBigItems, onlyMine, currentUser]);

  const totalKRW = useMemo(() => filtered.reduce((s, e) => s + e.krw, 0), [filtered]);

  if (expenses.length === 0) {
    return (
      <div className="px-5 pt-16 pb-16 text-center">
        <div className="flex justify-center text-text4 mb-3"><Icon name="chart" variant="line" size={36} /></div>
        <div className="text-[14px] leading-[21px] text-text2 mb-1">통계를 볼 수 없어요</div>
        <div className="text-[12px] leading-[18px] text-text4">지출을 기록하면 통계가 자동으로 만들어져요</div>
      </div>
    );
  }

  // 통계 계산
  const byDate: Record<string, number> = {};
  filtered.forEach((e) => { byDate[e.date] = (byDate[e.date] || 0) + e.krw; });
  const sortedDates = Object.keys(byDate).sort();
  const maxDaily = Math.max(...Object.values(byDate), 1);

  const byCategory: Record<string, number> = {};
  filtered.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.krw; });
  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = sortedCats.length > 0 ? sortedCats[0][1] : 1;

  const payerTotals: Record<string, number> = {};
  MEMBERS.forEach((m) => { payerTotals[m] = 0; });
  filtered.forEach((e) => { payerTotals[e.payer] += e.krw; });
  const maxPayer = Math.max(...Object.values(payerTotals), 1);

  const perPerson = Math.round(totalKRW / MEMBERS.length);

  return (
    <div className="flex flex-col gap-2 pt-1">
      {/* 제목 */}
      <div className="px-5 pt-2 pb-1 text-[24px] leading-[33px] text-text1" style={{ fontWeight: 800 }}>
        통계
      </div>

      {/* 요약 + 필터 */}
      <div className="mx-4 bg-white rounded-2xl px-5 py-4">
        <div className="text-[12px] leading-[18px] text-text3 mb-1">총 지출 {filtered.length}건</div>
        <div className="text-[22px] leading-[31px] font-bold text-text1 mb-1">{formatKRW(totalKRW)}원</div>
        <div className="text-[12px] leading-[18px] text-text4 mb-3">1인당 평균 {formatKRW(perPerson)}원</div>
        <div className="flex items-center gap-4 pt-3 border-t border-[#f0f1f3]">
          <label className="flex items-center gap-[6px] cursor-pointer">
            <input type="checkbox" checked={includeBigItems} onChange={(e) => setIncludeBigItems(e.target.checked)} className="w-[13px] h-[13px] rounded-sm accent-action shrink-0" />
            <span className="text-[12px] leading-[18px] text-text3">항공/숙박 포함하기</span>
          </label>
          <label className="flex items-center gap-[6px] cursor-pointer">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="w-[13px] h-[13px] rounded-sm accent-action shrink-0" />
            <span className="text-[12px] leading-[18px] text-text3">내 지출만 보기</span>
          </label>
        </div>
      </div>

      {/* 일별 지출 */}
      <div className="mx-4 bg-white rounded-2xl px-5 py-4">
        <div className="text-[15px] leading-[23px] font-bold text-text1 mb-3">일별 지출</div>
        <div className="flex flex-col gap-[6px]">
          {sortedDates.map((date) => {
            const amount = byDate[date];
            const d = new Date(date + "T00:00:00");
            const pct = Math.max(8, (amount / maxDaily) * 100);
            return (
              <div key={date} className="flex items-center gap-2">
                <span className="text-[11px] leading-[17px] text-text3 w-[32px] shrink-0 tabular-nums">
                  {d.getDate()}{DAY_NAMES[d.getDay()]}
                </span>
                <div className="flex-1 h-[22px] bg-[#f0f1f3] rounded-md relative overflow-hidden">
                  <div
                    className="h-full rounded-md flex items-center justify-end pr-2 transition-all duration-300"
                    style={{ width: `${pct}%`, background: "#3182f6" }}
                  >
                    {pct > 30 && (
                      <span className="text-[10px] leading-none text-white font-semibold">{formatKRW(amount)}</span>
                    )}
                  </div>
                  {pct <= 30 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] leading-none text-text3 font-semibold">
                      {formatKRW(amount)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 항목별 지출 */}
      <div className="mx-4 bg-white rounded-2xl px-5 py-4">
        <div className="text-[15px] leading-[23px] font-bold text-text1 mb-3">항목별 지출</div>
        {sortedCats.map(([cat, catTotal]) => {
          const pct = totalKRW > 0 ? (catTotal / totalKRW) * 100 : 0;
          const barPct = (catTotal / maxCat) * 100;
          const color = CATEGORY_COLORS[cat] ?? "#6b7684";
          const icon = CATEGORY_ICONS[cat];
          return (
            <div key={cat} className="mb-3 last:mb-0">
              <div className="flex justify-between items-center mb-[4px]">
                <span className="text-[13px] leading-[20px] font-semibold text-text1 flex items-center gap-[5px]">
                  {icon && <Icon name={icon} variant="fill" size={12} style={{ color }} />}
                  {cat}
                </span>
                <div className="flex items-baseline gap-[5px]">
                  <span className="text-[13px] leading-[20px] font-semibold text-text1">{formatKRW(catTotal)}원</span>
                  <span className="text-[11px] leading-[17px] text-text4 tabular-nums">{Math.round(pct)}%</span>
                </div>
              </div>
              <div className="h-[5px] bg-[#f0f1f3] rounded-full">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${barPct}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 결제자별 비중 */}
      <div className="mx-4 bg-white rounded-2xl px-5 py-4">
        <div className="text-[15px] leading-[23px] font-bold text-text1 mb-3">결제자별 비중</div>
        {MEMBERS.filter((m) => payerTotals[m] > 0)
          .sort((a, b) => payerTotals[b] - payerTotals[a])
          .map((m) => {
            const amt = payerTotals[m];
            const pct = totalKRW > 0 ? (amt / totalKRW) * 100 : 0;
            const barPct = (amt / maxPayer) * 100;
            return (
              <div key={m} className="mb-3 last:mb-0">
                <div className="flex justify-between items-center mb-[4px]">
                  <span className="text-[13px] leading-[20px] font-semibold text-text1">{m}</span>
                  <div className="flex items-baseline gap-[5px]">
                    <span className="text-[13px] leading-[20px] font-semibold text-text1">{formatKRW(amt)}원</span>
                    <span className="text-[11px] leading-[17px] text-text4 tabular-nums">{Math.round(pct)}%</span>
                  </div>
                </div>
                <div className="h-[5px] bg-[#f0f1f3] rounded-full">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${barPct}%`, background: "#03b26c" }} />
                </div>
              </div>
            );
          })}
      </div>

      <div className="h-2" />
    </div>
  );
}
