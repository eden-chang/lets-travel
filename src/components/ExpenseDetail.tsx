import { useState, useRef, useCallback } from "react";
import { MEMBERS, CATEGORY_COLORS, CATEGORY_ICONS } from "../constants";
import { formatKRW } from "../utils";
import { Icon } from "./Icon";
import type { Expense } from "../types";

interface ExpenseDetailProps {
  item: Expense;
  onEdit: () => void;
  onDel: (id: string) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
  onDragProgress?: (progress: number) => void;
}

export function ExpenseDetail({ item, onEdit, onDel, onClose, onToast, onDragProgress }: ExpenseDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 스와이프 뒤로가기
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragX = useRef(0);

  const slideOut = useCallback(() => {
    const el = panelRef.current;
    if (!el) { onClose(); return; }
    el.style.transition = "transform 0.2s ease-in";
    el.style.transform = "translateX(100%)";
    onDragProgress?.(1);
    setTimeout(onClose, 200);
  }, [onClose, onDragProgress]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches[0].clientX > 50) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    dragging.current = false;
    dragX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || !panelRef.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    if (!dragging.current && dy > 20 && dx < 20) { touchStart.current = null; return; }
    if (dx > 10) {
      dragging.current = true;
      dragX.current = dx;
      panelRef.current.style.transform = `translateX(${dx}px)`;
      panelRef.current.style.transition = "none";
      const screenW = panelRef.current.offsetWidth || 390;
      const progress = Math.min(1, Math.max(0, (dx / screenW - 0.2) / 0.8));
      onDragProgress?.(progress);
    }
  }, [onDragProgress]);

  const handleTouchEnd = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    if (dragging.current && dragX.current > 60) {
      slideOut();
    } else if (dragging.current) {
      el.style.transition = "transform 0.2s ease";
      el.style.transform = "translateX(0)";
      onDragProgress?.(0);
    }
    touchStart.current = null;
    dragging.current = false;
    dragX.current = 0;
  }, [slideOut, onDragProgress]);

  const catColor = CATEGORY_COLORS[item.category] ?? "#6b7684";
  const catIcon = CATEGORY_ICONS[item.category] ?? "etc";
  const isAllMembers = item.members.length === MEMBERS.length;

  const updatedAt = item.updated_at
    ? new Date(item.updated_at).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";

  const row = "flex items-center justify-between py-[10px] border-b border-[#f0f1f3] last:border-0";
  const rowLabel = "text-[13px] leading-[20px] text-text3";
  const rowValue = "text-[13px] leading-[20px] font-semibold text-text1 text-right";

  return (
    <div className="fixed inset-0 z-40 flex justify-center">
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full flex flex-col overflow-hidden"
        style={{ maxWidth: "390px", background: "#F2F4F6", animation: "slideInRight 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)" }}
      >
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{ animation: "whiteOverlayOut 0.28s ease both", zIndex: 50 }}
        />

        <div className="flex flex-col h-full" style={{ animation: "contentFadeIn 0.18s ease 0.06s both" }}>
          <div className="flex-1 overflow-y-auto custom-scroll">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 pb-3" style={{ paddingTop: "calc(max(env(safe-area-inset-top, 20px), 20px) + 8px)" }}>
              <span className="text-[24px] leading-[33px] text-text1" style={{ fontWeight: 800 }}>
                지출 상세
              </span>
              <button onClick={slideOut} className="text-[13px] leading-[20px] font-semibold text-text3 flex items-center justify-center">
                닫기
              </button>
            </div>

            {/* 금액 카드 */}
            <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center"
                  style={{ background: `${catColor}15`, color: catColor }}
                >
                  <Icon name={catIcon} variant="fill" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[16px] leading-[24px] font-bold text-text1 truncate">{item.desc}</div>
                  <div className="text-[11px] leading-[17px] text-text4">{item.date.slice(5).replace("-", "/")} · {item.city}</div>
                </div>
              </div>
              <div className="text-[26px] leading-[35px] font-bold text-text1">
                {item.currency === "KRW"
                  ? `${formatKRW(item.krw)}원`
                  : `${item.amount.toLocaleString()} ${item.currency}`
                }
              </div>
              {item.currency !== "KRW" && (
                <div className="text-[14px] leading-[21px] text-text3 mt-1">
                  = {formatKRW(item.krw)}원
                </div>
              )}
            </div>

            {/* 상세 정보 */}
            <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-2">
              <div className={row}>
                <span className={rowLabel}>결제 수단</span>
                <span className={rowValue}>{item.method === "card" ? "카드" : "현금"}</span>
              </div>
              <div className={row}>
                <span className={rowLabel}>카테고리</span>
                <span className={rowValue} style={{ color: catColor }}>{item.category}</span>
              </div>
              <div className={row}>
                <span className={rowLabel}>지출 날짜</span>
                <span className={rowValue}>{item.date}</span>
              </div>
              <div className={row}>
                <span className={rowLabel}>결제한 사람</span>
                <span className={rowValue}>{item.payer}</span>
              </div>
              <div className={row}>
                <span className={rowLabel}>정산할 사람</span>
                <span className={rowValue}>{isAllMembers ? "전원" : item.members.join(", ")}</span>
              </div>
            </div>

            {/* 상세 분할 */}
            {item.splitMode && item.splits && item.splits.length > 0 && (
              <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-4">
                <div className="text-[13px] leading-[20px] font-semibold text-text1 mb-2">상세 분할</div>
                {item.sharedAmount != null && item.sharedAmount > 0 && (
                  <div className="flex items-center justify-between py-[6px] border-b border-[#f0f1f3]">
                    <span className="text-[12px] leading-[18px] text-text3">공유 금액</span>
                    <span className="text-[12px] leading-[18px] font-semibold text-text1">{formatKRW(item.sharedAmount)}원</span>
                  </div>
                )}
                {item.splits.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-[6px] border-b border-[#f0f1f3] last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] leading-[18px] font-semibold text-text2">{s.member}</span>
                      {s.memo && <span className="text-[11px] leading-[17px] text-text4">{s.memo}</span>}
                    </div>
                    <span className="text-[12px] leading-[18px] font-semibold text-text1">{formatKRW(s.amount)}원</span>
                  </div>
                ))}
              </div>
            )}

            {/* 수정 시각 */}
            {updatedAt && (
              <div className="px-5 py-2 text-[11px] leading-[17px] text-text4 text-center">
                마지막 수정 : {updatedAt}
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="mx-4 mt-3 mb-2">
              <div className="flex gap-2">
                <button
                  onClick={onEdit}
                  className="flex-1 py-3 rounded-2xl text-[14px] leading-[21px] font-bold text-white flex items-center justify-center"
                  style={{ background: "var(--th)" }}
                >
                  수정하기
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-3 px-5 rounded-2xl text-[14px] leading-[21px] font-bold flex items-center justify-center bg-[#f2f3f7] text-danger"
                >
                  삭제
                </button>
              </div>
            </div>

            <div className="h-[80px]" />
          </div>
        </div>

        {/* 삭제 확인 */}
        {showDeleteConfirm && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
          >
            <div className="bg-white rounded-2xl mx-8 w-full max-w-[280px] overflow-hidden">
              <div className="px-5 pt-5 pb-4 text-center">
                <div className="text-[14px] leading-[21px] text-text1">정말 삭제하시겠습니까?</div>
              </div>
              <div className="flex border-t border-[#f0f1f3]">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 text-[14px] leading-[21px] text-text3 flex items-center justify-center border-r border-[#f0f1f3]"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    onDel(item.id);
                    setShowDeleteConfirm(false);
                    onToast("삭제했어요");
                    onClose();
                  }}
                  className="flex-1 py-3 text-[14px] leading-[21px] font-semibold text-danger flex items-center justify-center"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
