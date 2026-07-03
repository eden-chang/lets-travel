import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  onReorder: (items: Expense[]) => void;
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

  const start = new Date(TRIP.startDate + "T00:00:00");
  const end = new Date(TRIP.endDate + "T00:00:00");

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

// ── Expense Card (Sortable) ──
interface ExpenseCardProps {
  item: Expense;
  onClick: () => void;
}

function ExpenseCard({ item, onClick }: ExpenseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const color = CATEGORY_COLORS[item.category] ?? "#6b7280";
  const bg = CATEGORY_BG[item.category] ?? "#f3f4f6";
  const icon = CATEGORY_ICONS[item.category] ?? "etc";

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left active:bg-[#f8f8fa] transition-colors"
      >
        <div className="py-3 px-4 flex gap-3 items-center">
          <div
            {...listeners}
            className="shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center cursor-grab active:cursor-grabbing"
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
    </div>
  );
}

// ── Main ListTab ──
export function ListTab({ exp, currentUser, rates, ratesUpdatedAt, onDel, onEdit, onReorder }: ListTabProps) {
  const [dateFilter, setDateFilter] = useState("all");
  const [includeBigItems, setIncludeBigItems] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

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
    // Sort items within each date by order (if set), then by updated_at
    Object.keys(map).forEach((date) => {
      map[date].sort((a, b) => {
        // If both have order, sort by order
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        // If only one has order, it comes first
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        // Otherwise sort by updated_at (newest first)
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bTime - aTime;
      });
    });
    return map;
  }, [filtered]);

  const sortedDates = useMemo(
    () => Object.keys(grouped).sort().reverse(),
    [grouped]
  );

  const handleDragEnd = (event: DragEndEvent, date: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const items = grouped[date];
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the items
    const newItems = [...items];
    const [movedItem] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, movedItem);

    // Assign new order values
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      order: index,
    }));

    onReorder(updatedItems);
  };

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <div className="px-5 pt-4 pb-4">
        <span className="text-[24px] leading-[33px] text-text1" style={{ fontWeight: 800 }}>지출</span>
      </div>
      {/* 총 지출 요약 + 필터 */}
      <div className="mx-4 mb-3 bg-white rounded-2xl px-5 py-4">
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
      <div className="mx-4 mb-3 bg-white rounded-2xl px-2 py-[6px]">
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
            const d = new Date(date + "T00:00:00");
            const dayIdx = d.getDay();

            return (
              <DndContext
                key={date}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, date)}
              >
                <div className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden">
                  {/* 날짜 헤더 */}
                  <div className="px-4 pt-3 pb-2">
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
                  </div>

                  {/* 지출 항목들 */}
                  <SortableContext
                    items={grouped[date].map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {grouped[date].map((item, idx) => (
                      <div key={item.id}>
                        {idx > 0 && <div className="mx-4 border-t border-[#f0f1f3]" />}
                        <ExpenseCard
                          item={item}
                          onClick={() => onEdit(item)}
                        />
                      </div>
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
            );
          })}
          <div className="h-4" />
        </div>
      )}
    </div>
  );
}
