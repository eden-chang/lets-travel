import { useState, useEffect, useRef, useCallback } from "react";
import {
  MEMBERS,
  CATEGORIES,
  CURRENCIES,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  TRIP,
} from "../constants";
import { uid, toKRW, formatKRW } from "../utils";
import { DateInput } from "./DateInput";
import { Icon } from "./Icon";
import type { Expense, ExpenseSplit } from "../types";

interface AddFormProps {
  onAdd: (item: Expense) => void;
  onDel?: (id: string) => void;
  editItem: Expense | null;
  onClose: () => void;
  onDragProgress?: (progress: number) => void;
  onToast: (msg: string) => void;
  rates: Record<string, number>;
  ratesUpdatedAt: string;
}

export function AddForm({
  onAdd,
  onDel,
  editItem,
  onClose,
  onDragProgress,
  onToast,
  rates,
  ratesUpdatedAt,
}: AddFormProps) {
  // editItem에서 초기값 한 번에 세팅 (알약 전환 안 보이게)
  const [date, setDate] = useState(() => editItem?.date ?? new Date().toISOString().slice(0, 10));
  const [city, setCity] = useState(() => editItem?.city ?? TRIP.defaultCity);
  const [cat, setCat] = useState(() => editItem?.category ?? "식비");
  const [desc, setDesc] = useState(() => editItem?.desc ?? "");
  const [cur, setCur] = useState(() => editItem?.currency ?? "HUF");
  const [amt, setAmt] = useState(() => editItem ? String(editItem.amount) : "");
  const [payer, setPayer] = useState(() => editItem?.payer ?? "송");
  const [curOpen, setCurOpen] = useState(false);
  const [mems, setMems] = useState<string[]>(() => editItem ? [...editItem.members] : [...MEMBERS]);
  const [method, setMethod] = useState<"card" | "cash">(() => editItem?.method ?? "card");
  const [splitMode, setSplitMode] = useState(() => editItem?.splitMode ?? false);
  const [sharedAmount, setSharedAmount] = useState(() => editItem?.sharedAmount != null ? String(editItem.sharedAmount) : "");
  const [splits, setSplits] = useState<ExpenseSplit[]>(() =>
    editItem?.splits ?? MEMBERS.map((m) => ({ member: m, amount: 0, memo: "" }))
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 스와이프 뒤로가기
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragX = useRef(0);

  const slideOutFromCurrent = useCallback(() => {
    const el = panelRef.current;
    if (!el) { onClose(); return; }
    el.style.transition = "transform 0.2s ease-in";
    el.style.transform = "translateX(100%)";
    onDragProgress?.(1);
    setTimeout(onClose, 200);
  }, [onClose, onDragProgress]);

  const animateClose = useCallback(() => {
    slideOutFromCurrent();
  }, [slideOutFromCurrent]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t.clientX > 50) return; // 왼쪽 가장자리 50px
    touchStart.current = { x: t.clientX, y: t.clientY };
    dragging.current = false;
    dragX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || !panelRef.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    // 세로 스크롤 의도면 취소
    if (!dragging.current && dy > 20 && dx < 20) {
      touchStart.current = null;
      return;
    }
    if (dx > 10) {
      dragging.current = true;
      dragX.current = dx;
      panelRef.current.style.transform = `translateX(${dx}px)`;
      panelRef.current.style.transition = "none";
      // 화면 너비 기준 진행률 (30% 넘어가면 뒤쪽 화면 연동 시작)
      const screenW = panelRef.current.offsetWidth || 390;
      const progress = Math.min(1, Math.max(0, (dx / screenW - 0.2) / 0.8));
      onDragProgress?.(progress);
    }
  }, [onDragProgress]);

  const handleTouchEnd = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;

    if (dragging.current && dragX.current > 60) {
      slideOutFromCurrent();
    } else if (dragging.current) {
      el.style.transition = "transform 0.2s ease";
      el.style.transform = "translateX(0)";
      onDragProgress?.(0);
    }

    touchStart.current = null;
    dragging.current = false;
    dragX.current = 0;
  }, [slideOutFromCurrent]);

  const toggle = (m: string) =>
    setMems((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));

  const valid = Boolean(amt && desc && mems.length > 0);

  const submit = () => {
    if (!valid) return;
    const parsed = parseFloat(amt);
    onAdd({
      id: editItem ? editItem.id : uid(),
      date,
      city,
      category: cat,
      desc,
      currency: cur,
      amount: parsed,
      krw: toKRW(parsed, cur, rates),
      payer,
      members: [...mems],
      method,
      splitMode: splitMode || undefined,
      sharedAmount: splitMode ? (parseFloat(sharedAmount) || 0) : undefined,
      splits: splitMode ? splits.filter((s) => s.amount > 0) : undefined,
    });
    onToast(editItem ? "수정했어요" : "기록했어요");
    onClose();
  };

  const label = "text-[11px] leading-[17px] font-semibold text-text3 mb-[5px]";
  const selBtn = (active: boolean) =>
    `press-btn py-[6px] rounded-lg text-[12px] leading-[18px] font-medium transition-colors flex items-center justify-center ${
      active ? "bg-text1 text-white" : "bg-[#f2f3f7] text-text3"
    }`;

  return (
    <div className="fixed inset-0 z-40 flex justify-center">
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full flex flex-col overflow-hidden"
        style={{
          maxWidth: "390px",
          background: "#F2F4F6",
          animation: "slideInRight 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)",
        }}
      >
        {/* 흰색 오버레이 — 열릴 때 80%까지 페이드아웃 */}
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{
            animation: "whiteOverlayOut 0.28s ease both",
            zIndex: 50,
          }}
        />

        {/* 내용물 */}
        <div
          className="flex flex-col h-full"
          style={{ animation: "contentFadeIn 0.18s ease 0.06s both" }}
        >
        {/* 본문 */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 pb-4" style={{ paddingTop: "calc(max(env(safe-area-inset-top, 20px), 20px) + 8px)" }}>
            <span className="text-[24px] leading-[33px] text-text1" style={{ fontWeight: 800 }}>
              {editItem ? "지출 수정" : "지출 추가"}
            </span>
            <button onClick={animateClose} className="text-[12px] leading-[18px] font-semibold text-danger flex items-center justify-center">
              취소
            </button>
          </div>

          {/* 폼 영역 */}
          <div>

          {/* 내용 */}
          <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-4">
            <div className={label}>내용</div>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="어디서 뭘 했나요?"
              autoFocus
              className="w-full py-2 px-3 bg-[#f7f8fa] rounded-lg text-[13px] leading-[20px] text-text1 outline-none placeholder:text-text4"
            />
          </div>

          {/* 금액 + 화폐 */}
          <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-4">
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <div className={label}>금액</div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amt}
                  onChange={(e) => setAmt(e.target.value)}
                  placeholder="0"
                  className="w-full py-[6px] px-3 bg-[#f7f8fa] rounded-lg text-[15px] leading-[23px] font-bold text-text1 outline-none placeholder:text-text4 tabular-nums"
                />
              </div>
              <div className="w-[80px] relative">
                <div className={label}>화폐</div>
                <button
                  type="button"
                  onClick={() => setCurOpen((v) => !v)}
                  className="w-full py-[6px] px-2 bg-[#f7f8fa] rounded-lg text-[13px] leading-[20px] font-semibold text-text1 flex items-center justify-center gap-1"
                >
                  {cur}
                  <span className="text-[11px] text-text4"
                    style={{ transform: curOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s" }}
                  >▾</span>
                </button>
                {curOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setCurOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl z-20 py-1"
                      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)" }}
                    >
                      {CURRENCIES.map((c) => (
                        <button
                          key={c}
                          onClick={() => { setCur(c); setCurOpen(false); }}
                          className={`w-full py-[8px] px-3 text-[13px] leading-[20px] text-left flex items-center justify-between ${
                            cur === c ? "text-action font-semibold" : "text-text2"
                          }`}
                        >
                          {c}
                          {cur === c && <span className="text-action text-[12px]">✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            {amt && cur !== "KRW" && (
              <div className="mt-[5px] text-[11px] leading-[17px] text-text3 px-1">
                ≈ {formatKRW(toKRW(parseFloat(amt) || 0, cur, rates))}원
                <span className="text-text4 ml-1">(1{cur}={rates[cur]?.toLocaleString("ko-KR")}원)</span>
              </div>
            )}
          </div>

          {/* 결제수단 + 날짜 */}
          <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <div className={label}>결제수단</div>
                <div className="relative bg-[#f2f3f7] rounded-lg p-[3px]">
                  <div
                    className="absolute top-[3px] bottom-[3px] rounded-md transition-all duration-200 bg-text1"
                    style={{
                      width: "calc(50% - 2px)",
                      left: method === "card" ? "1px" : "calc(50% + 1px)",
                    }}
                  />
                  <div className="relative flex">
                    {(["card", "cash"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMethod(m)}
                        className={`flex-1 py-[6px] text-[12px] leading-[18px] font-semibold text-center z-10 transition-colors ${
                          method === m ? "text-white" : "text-text3"
                        }`}
                      >
                        {m === "card" ? "카드" : "현금"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="w-[72px]">
                <div className={label}>날짜</div>
                <DateInput
                  value={date}
                  onChange={setDate}
                  className="w-full py-[6px] px-2 bg-[#f2f3f7] rounded-lg text-[12px] leading-[18px] text-text1 text-center outline-none"
                />
              </div>
            </div>
          </div>

          {/* 항목 */}
          <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-4">
            <div className={label}>항목</div>
            <div className="flex flex-wrap gap-[5px]">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`press-btn px-[10px] py-[5px] rounded-full text-[11px] leading-[17px] font-medium transition-colors flex items-center justify-center gap-[3px] ${
                    cat === c ? "text-white" : "bg-white text-text3"
                  }`}
                  style={
                    cat === c
                      ? { background: CATEGORY_COLORS[c] }
                      : { boxShadow: "inset 0 0 0 1px #e0e2e7" }
                  }
                >
                  <Icon name={CATEGORY_ICONS[c]} variant="fill" size={12} />
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 결제자 + 나눌 사람 */}
          <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-4">
            <div className="mb-3">
              <div className={label}>결제한 사람</div>
              <div className="flex gap-[4px]">
                {MEMBERS.map((m) => (
                  <button key={m} onClick={() => setPayer(m)} className={`flex-1 ${selBtn(payer === m)}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-[5px]">
                <span className="text-[11px] leading-[17px] font-semibold text-text3">나눌 사람</span>
                <button
                  onClick={() => setMems(mems.length === MEMBERS.length ? [] : [...MEMBERS])}
                  className="text-[11px] leading-[17px] text-text4 flex items-center justify-center"
                >
                  {mems.length === MEMBERS.length ? "해제" : "전체"}
                </button>
              </div>
              <div className="flex gap-[4px]">
                {MEMBERS.map((m) => (
                  <button
                    key={m}
                    onClick={() => toggle(m)}
                    className={`press-btn flex-1 py-[6px] rounded-lg text-[12px] leading-[18px] font-medium transition-colors flex items-center justify-center ${
                      mems.includes(m) ? "text-white" : "bg-[#f2f3f7] text-text3"
                    }`}
                    style={mems.includes(m) ? { background: "var(--th)" } : undefined}
                  >
                    {mems.includes(m) ? "✓ " : ""}{m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 상세 분할 */}
          <div className="mx-4 mb-2 bg-white rounded-2xl px-5 py-4">
            {/* 토글 */}
            <div className={`flex items-center justify-between ${splitMode ? "mb-3" : ""}`}>
              <span className="text-[11px] leading-[17px] font-semibold text-text3">상세 분할</span>
              <div
                className="relative w-[40px] h-[22px] rounded-full cursor-pointer transition-colors"
                style={{ background: splitMode ? "var(--th)" : "#d1d6db" }}
                onClick={() => setSplitMode((v) => !v)}
              >
                <div
                  className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-all"
                  style={{ left: splitMode ? "20px" : "2px" }}
                />
              </div>
            </div>

            {splitMode && (
              <div className="pt-2 border-t border-[#f0f1f3]">
                {/* 공유 금액 */}
                <div className="mb-3">
                  <div className={label}>공유 금액 (균등 분할)</div>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={sharedAmount}
                    onChange={(e) => setSharedAmount(e.target.value)}
                    placeholder="0"
                    className="w-full py-[8px] px-3 bg-[#f7f8fa] rounded-lg text-[13px] leading-[20px] text-text1 outline-none tabular-nums"
                  />
                  <div className="text-[11px] leading-[17px] text-text4 mt-1 px-1">
                    {mems.length > 0 && sharedAmount
                      ? `${mems.join(", ")} 각 ${formatKRW(Math.floor((parseFloat(sharedAmount) || 0) / mems.length))}원`
                      : "나눌 사람들이 균등하게 분할"}
                  </div>
                </div>

                {/* 개인별 추가 */}
                <div className={label}>개인별 추가 금액</div>
                <div className="flex flex-col gap-2">
                  {MEMBERS.map((m) => {
                    const sp = splits.find((s) => s.member === m);
                    return (
                      <div key={m} className="flex items-center gap-2">
                        <span className="text-[12px] leading-[18px] font-semibold text-text2 w-[32px] shrink-0">{m}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={sp?.amount || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setSplits((prev) => {
                              const next = prev.filter((s) => s.member !== m);
                              next.push({ member: m, amount: val, memo: sp?.memo ?? "" });
                              return next;
                            });
                          }}
                          placeholder="0"
                          className="w-[60px] shrink-0 py-[6px] px-2 bg-[#f7f8fa] rounded-lg text-[13px] leading-[20px] text-text1 outline-none tabular-nums text-right"
                        />
                        <input
                          type="text"
                          value={sp?.memo ?? ""}
                          onChange={(e) => {
                            setSplits((prev) => {
                              const next = prev.filter((s) => s.member !== m);
                              next.push({ member: m, amount: sp?.amount ?? 0, memo: e.target.value });
                              return next;
                            });
                          }}
                          placeholder="메모"
                          className="flex-1 py-[6px] px-2 bg-[#f7f8fa] rounded-lg text-[12px] leading-[18px] text-text3 outline-none"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* 합계 확인 */}
                {amt && (
                  <div className="mt-3 pt-2 border-t border-[#f0f1f3]">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] leading-[18px] text-text3">합계</span>
                      <span className={`text-[13px] leading-[20px] font-bold ${
                        Math.abs(
                          (parseFloat(sharedAmount) || 0) + splits.reduce((s, sp) => s + (sp.amount || 0), 0) - (parseFloat(amt) || 0)
                        ) < 1 ? "text-positive" : "text-danger"
                      }`}>
                        {formatKRW(
                          (parseFloat(sharedAmount) || 0) + splits.reduce((s, sp) => s + (sp.amount || 0), 0)
                        )}원
                        {Math.abs(
                          (parseFloat(sharedAmount) || 0) + splits.reduce((s, sp) => s + (sp.amount || 0), 0) - (parseFloat(amt) || 0)
                        ) < 1 ? " ✓" : ` (총액 ${formatKRW(parseFloat(amt) || 0)}원)`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          </div>
          {/* 폼 영역 끝 */}

          {/* 하단 버튼 */}
          <div className="mx-4 mt-5 mb-2">
            <button
              onClick={submit}
              disabled={!valid}
              className={`w-full py-3 rounded-2xl text-[14px] leading-[21px] font-bold transition-colors flex items-center justify-center ${
                valid ? "text-white" : "bg-[#e0e2e7] text-text4"
              }`}
              style={valid ? { background: "var(--th)" } : undefined}
            >
              {editItem ? "수정 완료" : "기록하기"}
            </button>
            {editItem && onDel && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full mt-2 py-2 text-[13px] leading-[20px] text-danger flex items-center justify-center"
              >
                이 지출 삭제
              </button>
            )}
          </div>

          <div className="h-[100px]" />
        </div>

        {/* 삭제 확인 팝업 */}
        {showDeleteConfirm && editItem && onDel && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
          >
            <div className="bg-white rounded-2xl mx-8 w-full max-w-[280px] overflow-hidden">
              <div className="px-5 pt-5 pb-4 text-center">
                <div className="text-[14px] leading-[21px] text-text1">
                  정말 삭제하시겠습니까?
                </div>
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
                    onDel(editItem.id);
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
    </div>
  );
}
