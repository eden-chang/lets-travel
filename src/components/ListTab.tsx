import { useState, useMemo } from "react";
import {
  MEMBERS,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_BG,
  DAY_NAMES,
  TRIP,
} from "../constants";
import { formatKRW } from "../utils";
import { Icon } from "./Icon";
import type { Expense } from "../types";

interface ListTabProps {
  exp: Expense[];
  currentUser: string;
  rates: Record<string, number>;
  ratesUpdatedAt: string;
  onDel: (id: string) => void;
  onEdit: (item: Expense) => void;
}


interface DateTab {
  value: string;
  day: string;
  weekday: string;
  weekdayIdx: number;
}

function buildDateTabs(): DateTab[] {
  const tabs: DateTab[] = [
    { value: "all", day: "전체", weekday: "", weekdayIdx: -1 },
    { value: "prep", day: "준비", weekday: "", weekdayIdx: -1 },
  ];

  const start = new Date(TRIP.startDate);
  const end = new Date(TRIP.endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    tabs.push({
      value: iso,
      day: String(d.getDate()),
      weekday: DAY_NAMES[d.getDay()],
      weekdayIdx: d.getDay(),
    });
  }

  return tabs;
}

const DATE_TABS = buildDateTabs();

// ── Expense Card ──
interface ExpenseCardProps {
  item: Expense;
  onClick: () => void;
}

function ExpenseCard({ item, onClick }: ExpenseCardProps) {
  const color = CATEGORY_COLORS[item.category] ?? "#6b7280";
  const bg = CATEGORY_BG[item.category] ?? "#f3f4f6";
  const icon = CATEGORY_ICONS[item.category] ?? "etc";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left active:bg-[#f8f8fa] transition-colors"
    >
      <div className="py-3 px-4 flex gap-3 items-center">
        <div
          className="shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center"
          style={{ backgroundColor: bg, color }}
        >
          <Icon name={icon} variant="fill" size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[14px] leading-[21px] font-semibold text-text1 truncate">
            {item.desc}
          </div>
          <div className="text-[11px] leading-[17px] text-text4 mt-[2px]">
            {item.payer} 결제 · {item.members.length === MEMBERS.length ? "전원" : item.members.join(", ")}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[15px] leading-[23px] font-bold text-text1">
            {formatKRW(item.krw)}원
          </div>
          {item.currency !== "KRW" && (
            <div className="tabular-nums text-[11px] leading-[17px] text-text4">
              {item.amount.toLocaleString()} {item.currency}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main ListTab ──
export function ListTab({ exp, currentUser, rates, ratesUpdatedAt, onDel, onEdit }: ListTabProps) {
  const [dateFilter, setDateFilter] = useState("all");
  const [includeBigItems, setIncludeBigItems] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [showRates, setShowRates] = useState(false);

  const EXCLUDED_CATS = ["항공", "숙박"];

  const baseExp = useMemo(() => {
    let list = exp;
    if (!includeBigItems) list = list.filter((e) => !EXCLUDED_CATS.includes(e.category));
    if (onlyMine) list = list.filter((e) => e.members.includes(currentUser));
    return list;
  }, [exp, currentUser, onlyMine, includeBigItems]);

  const totalCount = baseExp.length;
  const totalKRW = useMemo(() => baseExp.reduce((s, e) => s + e.krw, 0), [baseExp]);

  const filtered = useMemo(() => {
    let list = baseExp;
    if (dateFilter === "prep") {
      list = list.filter((e) => e.date < TRIP.startDate);
    } else if (dateFilter !== "all") {
      list = list.filter((e) => e.date === dateFilter);
    }
    return list;
  }, [baseExp, dateFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    filtered.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filtered]);

  const sortedDates = useMemo(
    () => Object.keys(grouped).sort().reverse(),
    [grouped]
  );

  const KRW_BASE = 10000;
  const ratesTimeStr = ratesUpdatedAt
    ? new Date(ratesUpdatedAt).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <div className="px-5 pt-2 pb-1 flex items-center justify-between">
        <span className="text-[24px] leading-[33px] text-text1" style={{ fontWeight: 800 }}>지출</span>
        <button
          onClick={() => setShowRates((v) => !v)}
          className={`text-[12px] leading-[18px] font-semibold px-3 py-[6px] rounded-full flex items-center justify-center ${
            showRates ? "bg-action text-white" : "bg-white text-text1 border border-border"
          }`}
        >
          환율 보기
        </button>
      </div>

      {showRates && (
        <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-3">
          <div className="text-[11px] leading-[17px] text-text4 mb-2">
            1만원 기준{ratesTimeStr && ` · ${ratesTimeStr} 기준`}
          </div>
          <div className="flex flex-col gap-[6px]">
            {(["EUR", "CZK", "HUF"] as const).map((c) => {
              const rate = rates[c] ?? 1;
              const converted = rate > 0 ? KRW_BASE / rate : 0;
              const decimals = converted < 10 ? 2 : converted < 100 ? 1 : 0;
              return (
                <div key={c} className="flex items-center justify-between">
                  <span className="text-[13px] leading-[20px] font-semibold text-text2">{c}</span>
                  <span className="text-[13px] leading-[20px] text-text1 tabular-nums">
                    {converted.toFixed(decimals)} <span className="text-text4 text-[11px] leading-[17px]">(1{c}={rate.toLocaleString("ko-KR")}원)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 총 지출 요약 + 필터 */}
      <div className="mx-4 mt-1 mb-2 bg-white rounded-2xl px-5 py-4">
        <div className="text-[12px] leading-[18px] text-text3 mb-1">
          총 지출 {totalCount}건
        </div>
        <div className="text-[22px] leading-[27px] font-bold text-text1 mb-3">
          {formatKRW(totalKRW)}원
        </div>
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

      {/* 날짜 탭 */}
      <div className="mx-4 mb-2 bg-white rounded-2xl px-2 py-[6px]">
        <div className="flex">
          {/* "전체" 고정 */}
          <button
            onClick={() => setDateFilter("all")}
            className={`shrink-0 w-[40px] h-[40px] flex items-center justify-center rounded-[10px] transition-all text-[12px] leading-[18px] font-bold ${dateFilter === "all" ? "text-white" : "text-text3"
              }`}
            style={{ background: dateFilter === "all" ? "var(--th)" : "transparent" }}
          >
            전체
          </button>

          <div className="w-[1px] bg-[#e8eaef] mx-[4px] my-[6px] shrink-0" />

          {/* 나머지 스크롤 영역 */}
          <div className="flex overflow-x-auto gap-[2px] flex-1">
            {DATE_TABS.filter((t) => t.value !== "all").map((tab) => {
              const active = dateFilter === tab.value;
              const isSat = tab.weekdayIdx === 6;
              const isSun = tab.weekdayIdx === 0;
              const hasWeekday = !!tab.weekday;

              let weekdayColor = "#8b95a1";
              if (isSat) weekdayColor = "#3182f6";
              if (isSun) weekdayColor = "#f04452";

              return (
                <button
                  key={tab.value}
                  onClick={() => setDateFilter(tab.value)}
                  className={`shrink-0 w-[40px] h-[40px] flex items-center justify-center rounded-[10px] transition-all ${active ? "text-white" : "text-text3"
                    }`}
                  style={{ background: active ? "var(--th)" : "transparent" }}
                >
                  {hasWeekday ? (
                    <span className="flex flex-col items-center">
                      <span
                        className="text-[11px] leading-none mb-[2px]"
                        style={active ? { opacity: 0.8 } : { color: weekdayColor }}
                      >
                        {tab.weekday}
                      </span>
                      <span
                        className="text-[13px] font-bold leading-none"
                        style={!active && (isSat || isSun) ? { color: weekdayColor } : undefined}
                      >
                        {tab.day}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[12px] font-bold leading-none">{tab.day}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 지출 카드 목록 */}
      {filtered.length === 0 ? (
        <div className="px-5 pt-16 pb-16 text-center">
          <div className="flex justify-center text-text4 mb-3">
            <Icon name="bill" variant="line" size={36} />
          </div>
          <div className="text-[14px] leading-[21px] text-text2 mb-1">내역이 없어요</div>
          <div className="text-[12px] leading-[18px] text-text4">
            + 버튼으로 지출을 기록해 보세요
          </div>
        </div>
      ) : (
        <div>
          {sortedDates.map((date) => {
            const d = new Date(date);
            const dayTotal = grouped[date].reduce((s, e) => s + e.krw, 0);
            const dayIdx = d.getDay();
            const isSat = dayIdx === 6;
            const isSun = dayIdx === 0;

            return (
              <div key={date} className="mx-4 mb-2 bg-white rounded-2xl overflow-hidden">
                {/* 날짜 헤더 */}
                <div className="flex justify-between items-center px-4 pt-3 pb-2">
                  <span className="text-[13px] leading-[20px] font-bold text-text1">
                    {date.slice(5).replace("-", "/")}{" "}
                    <span
                      className="font-normal"
                      style={{
                        color: "#8b95a1",
                      }}
                    >
                      {DAY_NAMES[dayIdx]}
                    </span>
                  </span>
                  <span className="tabular-nums text-[11px] leading-[17px] font-semibold text-text3">
                    {formatKRW(dayTotal)}원
                  </span>
                </div>

                {/* 지출 항목들 */}
                {grouped[date].map((item, idx) => (
                  <div key={item.id}>
                    {idx > 0 && <div className="mx-4 border-t border-[#f0f1f3]" />}
                    <ExpenseCard
                      item={item}
                      onClick={() => onEdit(item)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
          <div className="h-4" />
        </div>
      )}
    </div>
  );
}
