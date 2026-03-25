import { useState, useRef, useCallback } from "react";
import { MEMBERS, CURRENCIES, COLORS } from "../constants";
import { uid, formatKRW } from "../utils";
import { DateInput } from "./DateInput";
import type { Transfer, TransferType } from "../types";

interface TransferFormProps {
  onSave: (item: Transfer) => void;
  onDel?: (id: string) => void;
  editItem: Transfer | null;
  onClose: () => void;
  onDragProgress?: (progress: number) => void;
  onToast: (msg: string) => void;
}

const TYPE_OPTIONS: { key: TransferType; label: string; color: string }[] = [
  { key: "deposit", label: "선입금", color: COLORS.deposit },
  { key: "settlement", label: "정산", color: COLORS.action },
  { key: "cash_exchange", label: "현금거래", color: COLORS.positive },
];

export function TransferForm({ onSave, onDel, editItem, onClose, onDragProgress, onToast }: TransferFormProps) {
  const [type, setType] = useState<TransferType>(() => editItem?.type ?? "settlement");
  const [from, setFrom] = useState(() => editItem?.from ?? "약국");
  const [to, setTo] = useState(() => editItem?.to ?? "송");
  const [amount, setAmount] = useState(() => editItem ? String(editItem.amount) : "");
  const [date, setDate] = useState(() => editItem?.date ?? new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState(() => editItem?.memo ?? "");
  const [currency, setCurrency] = useState(() => editItem?.currency ?? "KRW");
  const [curOpen, setCurOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 스와이프
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
    dragging.current = false; dragX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || !panelRef.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    if (!dragging.current && dy > 20 && dx < 20) { touchStart.current = null; return; }
    if (dx > 10) {
      dragging.current = true; dragX.current = dx;
      panelRef.current.style.transform = `translateX(${dx}px)`;
      panelRef.current.style.transition = "none";
      const w = panelRef.current.offsetWidth || 390;
      onDragProgress?.(Math.min(1, Math.max(0, (dx / w - 0.2) / 0.8)));
    }
  }, [onDragProgress]);

  const handleTouchEnd = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    if (dragging.current && dragX.current > 60) { slideOut(); }
    else if (dragging.current) { el.style.transition = "transform 0.2s ease"; el.style.transform = "translateX(0)"; onDragProgress?.(0); }
    touchStart.current = null; dragging.current = false; dragX.current = 0;
  }, [slideOut, onDragProgress]);

  const valid = Boolean(amount && from !== to);
  const currentType = TYPE_OPTIONS.find((t) => t.key === type)!;
  const typeColor = currentType.color;
  const typeIdx = TYPE_OPTIONS.findIndex((t) => t.key === type);

  const submit = () => {
    if (!valid) return;
    onSave({
      id: editItem ? editItem.id : uid(),
      type, from, to,
      amount: parseFloat(amount),
      currency: type === "cash_exchange" ? currency : undefined,
      date,
      memo: memo || currentType.label,
    });
    onToast(editItem ? "수정했어요" : "등록했어요");
    onClose();
  };

  // 보낸 사람 선택 시 받는 사람에서 동일인 방지
  const handleFromChange = (m: string) => {
    setFrom(m);
    if (to === m) {
      const other = MEMBERS.find((x) => x !== m);
      if (other) setTo(other);
    }
  };

  const label = "text-[11px] leading-[17px] font-semibold text-text3 mb-[5px]";
  const inputH = "py-[8px] px-3 bg-[#f7f8fa] rounded-lg text-[13px] leading-[20px] text-text1 outline-none";

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
        <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: "whiteOverlayOut 0.28s ease both", zIndex: 50 }} />

        <div className="flex flex-col h-full" style={{ animation: "contentFadeIn 0.18s ease 0.06s both" }}>
          <div className="flex-1 overflow-y-auto custom-scroll">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 pb-4" style={{ paddingTop: "calc(max(env(safe-area-inset-top, 20px), 20px) + 8px)" }}>
              <span className="text-[24px] leading-[33px] text-text1" style={{ fontWeight: 800 }}>
                {editItem ? "송금 수정" : "송금 추가"}
              </span>
              <button onClick={slideOut} className="text-[12px] leading-[18px] font-semibold text-danger flex items-center justify-center">
                취소
              </button>
            </div>

            {/* 유형 — 슬라이딩 토글 */}
            <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-4">
              <div className={label}>유형</div>
              <div className="relative bg-[#f2f3f7] rounded-lg p-[3px]">
                {/* 슬라이딩 알약 */}
                <div
                  className="absolute top-[3px] bottom-[3px] rounded-md transition-all duration-200"
                  style={{
                    width: `calc(${100 / TYPE_OPTIONS.length}% - 2px)`,
                    left: `calc(${(typeIdx * 100) / TYPE_OPTIONS.length}% + 1px)`,
                    background: typeColor,
                  }}
                />
                <div className="relative flex">
                  {TYPE_OPTIONS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setType(t.key)}
                      className={`flex-1 py-[7px] text-[12px] leading-[18px] font-semibold text-center z-10 transition-colors ${
                        type === t.key ? "text-white" : "text-text3"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 금액 + 화폐 + 송금 날짜 + 메모 */}
            <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-4">
              <div className="flex gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className={label}>{type === "cash_exchange" ? "금액" : "금액 (원)"}</div>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className={`${inputH} w-full font-bold tabular-nums`}
                  />
                </div>
                {type === "cash_exchange" && (
                  <div className="w-[72px] relative">
                    <div className={label}>화폐</div>
                    <button
                      type="button"
                      onClick={() => setCurOpen((v) => !v)}
                      className={`${inputH} w-full font-semibold flex items-center justify-center gap-1`}
                    >
                      {currency}
                      <span className="text-[11px] text-text4" style={{ transform: curOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s" }}>▾</span>
                    </button>
                    {curOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setCurOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl z-20 py-1" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)" }}>
                          {CURRENCIES.map((c) => (
                            <button
                              key={c}
                              onClick={() => { setCurrency(c); setCurOpen(false); }}
                              className={`w-full py-[8px] px-3 text-[13px] leading-[20px] text-left flex items-center justify-between ${currency === c ? "text-action font-semibold" : "text-text2"}`}
                            >
                              {c}
                              {currency === c && <span className="text-action text-[12px]">✓</span>}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="w-[72px]">
                  <div className={label}>송금 날짜</div>
                  <DateInput
                    value={date}
                    onChange={setDate}
                    className={`${inputH} w-full text-center`}
                  />
                </div>
              </div>
              <div>
                <div className={label}>메모</div>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="1~3일차 정산"
                  className={`${inputH} w-full`}
                />
              </div>
            </div>

            {/* 보낸 사람 + 받는 사람 */}
            <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-4">
              <div className="mb-3">
                <div className={label}>보낸 사람</div>
                <div className="flex gap-[4px]">
                  {MEMBERS.map((m) => (
                    <button
                      key={m}
                      onClick={() => handleFromChange(m)}
                      className={`press-btn flex-1 py-[6px] rounded-lg text-[12px] leading-[18px] font-medium transition-colors flex items-center justify-center ${
                        from === m ? "text-white" : "bg-[#f2f3f7] text-text3"
                      }`}
                      style={from === m ? { background: typeColor } : undefined}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className={label}>받는 사람</div>
                <div className="flex gap-[4px]">
                  {MEMBERS.map((m) => {
                    const disabled = m === from;
                    return (
                      <button
                        key={m}
                        onClick={() => !disabled && setTo(m)}
                        className={`press-btn flex-1 py-[6px] rounded-lg text-[12px] leading-[18px] font-medium transition-colors flex items-center justify-center ${
                          disabled
                            ? "bg-[#f2f3f7] text-text4 opacity-40"
                            : to === m
                              ? "text-white"
                              : "bg-[#f2f3f7] text-text3"
                        }`}
                        style={!disabled && to === m ? { background: typeColor } : undefined}
                        disabled={disabled}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 미리보기 */}
            {amount && from !== to && (
              <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-3">
                <div className="text-[13px] leading-[20px] text-text2">
                  {from} → {to}
                </div>
                <div className="text-[16px] leading-[24px] font-bold" style={{ color: typeColor }}>
                  {formatKRW(parseInt(amount) || 0)}원
                </div>
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="mx-4 mt-5 mb-2">
              <button
                onClick={submit}
                disabled={!valid}
                className={`w-full py-3 rounded-2xl text-[14px] leading-[21px] font-bold transition-colors flex items-center justify-center ${
                  valid ? "text-white" : "bg-[#e0e2e7] text-text4"
                }`}
                style={valid ? { background: typeColor } : undefined}
              >
                {editItem ? "수정 완료" : "등록하기"}
              </button>
              {editItem && onDel && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full mt-2 py-2 text-[13px] leading-[20px] text-danger flex items-center justify-center"
                >
                  이 송금 삭제
                </button>
              )}
            </div>

            <div className="h-[32px]" />
          </div>
        </div>

        {/* 삭제 확인 */}
        {showDeleteConfirm && editItem && onDel && (
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
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 text-[14px] leading-[21px] text-text3 flex items-center justify-center border-r border-[#f0f1f3]">
                  취소
                </button>
                <button
                  onClick={() => { onDel(editItem.id); setShowDeleteConfirm(false); onToast("삭제했어요"); onClose(); }}
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
