import { useMemo, useState } from "react";
import { CURRENCIES } from "../constants";
import { formatKRW, uid } from "../utils";
import { Icon } from "./Icon";
import type { Expense, Transfer, CashEntry, Settlement } from "../types";

interface WalletTabProps {
  settlement: Settlement;
  expenses: Expense[];
  transfers: Transfer[];
  cashEntries: CashEntry[];
  saveCash: (item: CashEntry) => Promise<void>;
  deleteCash: (id: string) => Promise<void>;
  rates: Record<string, number>;
  ratesUpdatedAt: string;
  currentUser: string;
  budget: number;
  setBudget: (val: number) => void;
}

export function WalletTab({
  settlement,
  expenses,
  transfers,
  cashEntries,
  saveCash,
  deleteCash,
  rates,
  ratesUpdatedAt,
  currentUser,
  budget,
  setBudget,
}: WalletTabProps) {
  const [cashFormOpen, setCashFormOpen] = useState(false);
  const [cashEditMode, setCashEditMode] = useState(false);
  const [addCur, setAddCur] = useState("EUR");
  const [addAmt, setAddAmt] = useState("");
  const [addMemo, setAddMemo] = useState("");
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});
  const [editBudget, setEditBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(budget));
  const [includeBigItems, setIncludeBigItems] = useState(false);

  const EXCLUDED_CATS = ["항공", "숙박"];

  // 내가 포함된 지출만
  const myExpenses = useMemo(
    () => expenses.filter((e) => e.members.includes(currentUser)),
    [expenses, currentUser]
  );

  // 항공/숙박 필터 적용된 지출
  const myFiltered = useMemo(
    () => includeBigItems ? myExpenses : myExpenses.filter((e) => !EXCLUDED_CATS.includes(e.category)),
    [myExpenses, includeBigItems]
  );

  // 내가 부담해야 할 금액 (필터 적용)
  const myOwes = useMemo(() => {
    return myFiltered.reduce((sum, e) => {
      if (e.splitMode && e.splits) {
        const memberCount = e.members.length || 1;
        const shared = e.sharedAmount ?? 0;
        const sharedKrw = Math.round((shared / e.amount) * e.krw);
        const myPersonal = e.splits.find((s) => s.member === currentUser);
        const personalAmt = myPersonal ? myPersonal.amount : 0;
        const personalKrw = Math.round((personalAmt / e.amount) * e.krw);
        return sum + Math.floor(sharedKrw / memberCount) + personalKrw;
      }
      return sum + Math.floor(e.krw / e.members.length);
    }, 0);
  }, [myFiltered, currentUser]);

  // 내가 결제한 금액 (필터 적용)
  const myPaid = useMemo(
    () => myFiltered.filter((e) => e.payer === currentUser).reduce((s, e) => s + e.krw, 0),
    [myFiltered, currentUser]
  );

  // 카드/현금 결제 분리 (필터 적용)
  const myCardTotal = useMemo(
    () => myFiltered.filter((e) => e.payer === currentUser && e.method === "card").reduce((s, e) => s + e.krw, 0),
    [myFiltered, currentUser]
  );
  const myCashTotal = useMemo(
    () => myFiltered.filter((e) => e.payer === currentUser && e.method === "cash").reduce((s, e) => s + e.krw, 0),
    [myFiltered, currentUser]
  );

  // 남은 정산 상태
  const myBalance = settlement.perMember[currentUser];
  const mySettlements = useMemo(
    () => settlement.remaining.filter((s) => s.from === currentUser || s.to === currentUser),
    [settlement.remaining, currentUser]
  );

  // 현금 잔액
  const cashBalance = useMemo(() => {
    const bal: Record<string, number> = {};
    CURRENCIES.forEach((c) => (bal[c] = 0));
    cashEntries.forEach((c) => { bal[c.currency] = (bal[c.currency] || 0) + c.amount; });
    expenses.forEach((e) => {
      if (e.method === "cash" && e.payer === currentUser) {
        bal[e.currency] = (bal[e.currency] || 0) - e.amount;
      }
    });
    return bal;
  }, [cashEntries, expenses, currentUser]);

  const totalCashKRW = useMemo(() => {
    return Object.entries(cashBalance).reduce((sum, [cur, amt]) => {
      return sum + Math.round(amt * (rates[cur] ?? 1));
    }, 0);
  }, [cashBalance, rates]);

  // 예산
  const remaining = budget - myOwes;
  const budgetPct = budget > 0 ? Math.min(100, Math.round((myOwes / budget) * 100)) : 0;

  const handleAddCash = () => {
    if (!addAmt || parseFloat(addAmt) <= 0) return;
    saveCash({
      id: uid(),
      currency: addCur,
      amount: parseFloat(addAmt),
      memo: addMemo || "현금 등록",
      date: new Date().toISOString().slice(0, 10),
    });
    setAddAmt("");
    setAddMemo("");
    setCashFormOpen(false);
  };

  const saveBudget = () => {
    const val = Number(budgetInput);
    if (val > 0) setBudget(val);
    setEditBudget(false);
  };

  // 섹션 헤더 공통 스타일
  const sectionHeader = "flex items-center justify-between mb-3";
  const sectionTitle = "text-[15px] font-bold text-text1";
  const actionBtn = "text-[12px] font-semibold px-3 py-[6px] rounded-full flex items-center justify-center";

  const [showRates, setShowRates] = useState(false);
  const KRW_BASE = 10000;

  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="px-5 pt-4 pb-4 flex items-center justify-between">
        <span className="text-[24px] leading-[33px] text-text1" style={{ fontWeight: 800 }}>나의 지갑</span>
        <button
          onClick={() => setShowRates((v) => !v)}
          className={`${actionBtn} border border-border ${showRates ? "bg-action text-white border-action" : "bg-white text-text1"}`}
        >
          환율 보기
        </button>
      </div>

      {showRates && (
        <div className="mx-4 bg-white rounded-2xl px-5 py-3">
          <div className="text-[11px] leading-[17px] text-text4 mb-2">
            1만원 기준
            {ratesUpdatedAt && (
              <span className="ml-1">· {new Date(ratesUpdatedAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })} 기준</span>
            )}
          </div>
          <div className="flex flex-col gap-[6px]">
            {(["EUR", "CZK", "HUF", "USD"] as const).map((c) => {
              const rate = rates[c] ?? (c === "USD" ? 1350 : 1);
              const converted = rate > 0 ? (KRW_BASE / rate) : 0;
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

      {/* ── 지출 ── */}
      <div className="mx-4 bg-white rounded-2xl px-5 py-4">
        <div className={sectionHeader}>
          <span className={sectionTitle}>나의 지출</span>
          <span className="text-[12px] leading-[18px] text-text4">{myFiltered.length}건</span>
        </div>
        <div className="text-[22px] leading-[31px] font-bold text-text1 mb-3">{formatKRW(myOwes)}원</div>
        <div className="flex flex-col gap-[8px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] leading-[20px] text-text3">결제한 금액</span>
            <span className="text-[13px] leading-[20px] font-semibold text-text1">{formatKRW(myPaid)}원</span>
          </div>
          <div className="flex items-center justify-between pl-3">
            <span className="text-[12px] leading-[18px] text-text4">카드</span>
            <span className="text-[12px] leading-[18px] text-text2">{formatKRW(myCardTotal)}원</span>
          </div>
          <div className="flex items-center justify-between pl-3">
            <span className="text-[12px] leading-[18px] text-text4">현금</span>
            <span className="text-[12px] leading-[18px] text-text2">{formatKRW(myCashTotal)}원</span>
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3 pt-3 border-t border-[#f0f1f3] cursor-pointer">
          <input
            type="checkbox"
            checked={includeBigItems}
            onChange={(e) => setIncludeBigItems(e.target.checked)}
            className="w-[13px] h-[13px] rounded-sm accent-action"
          />
          <span className="text-[12px] leading-[18px] text-text3">항공/숙박 포함하기</span>
        </label>
      </div>

      {/* ── 현금 ── */}
      <div className="mx-4 bg-white rounded-2xl px-5 py-4">
        <div className={sectionHeader}>
          <span className={sectionTitle}>보유한 현금</span>
          <div className="flex items-center gap-[6px]">
            {cashEntries.length > 0 && (
              <button
                onClick={() => {
                  if (cashEditMode) {
                    setCashEditMode(false);
                    setEditAmounts({});
                  } else {
                    const map: Record<string, string> = {};
                    cashEntries.forEach((c) => { map[c.id] = String(c.amount); });
                    setEditAmounts(map);
                    setCashEditMode(true);
                    setCashFormOpen(false);
                  }
                }}
                className={`${actionBtn} ${cashEditMode ? "text-action border border-action/20" : "text-text4 border border-border"}`}
              >
                {cashEditMode ? "완료" : "편집"}
              </button>
            )}
            {!cashEditMode && (
              <button
                onClick={() => { setCashFormOpen(!cashFormOpen); setCashEditMode(false); }}
                className={`${actionBtn} text-action border border-action/20`}
              >
                {cashFormOpen ? "닫기" : "+ 추가"}
              </button>
            )}
          </div>
        </div>
        <div className="text-[22px] leading-[31px] font-bold text-text1 mb-3">{formatKRW(totalCashKRW)}원</div>

        <div className="flex flex-col gap-[8px]">
          {cashEntries.map((entry) => {
            const spent = expenses
              .filter((e) => e.method === "cash" && e.payer === currentUser && e.currency === entry.currency)
              .reduce((s, e) => s + e.amount, 0);
            const rem = entry.amount - spent;
            const krw = Math.round(rem * (rates[entry.currency] ?? 1));

            if (cashEditMode) {
              return (
                <div key={entry.id} className="flex items-center gap-2">
                  <span className="text-[13px] leading-[20px] font-semibold text-text2 w-[40px]">{entry.currency}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={editAmounts[entry.id] ?? String(entry.amount)}
                    onChange={(e) => setEditAmounts((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                    onBlur={() => {
                      const val = parseFloat(editAmounts[entry.id] ?? "");
                      if (!isNaN(val) && val !== entry.amount) {
                        saveCash({ ...entry, amount: val });
                      }
                    }}
                    className="w-[80px] px-2 py-[6px] border border-border rounded-lg text-[14px] leading-[21px] outline-none text-right"
                  />
                  <button
                    onClick={() => deleteCash(entry.id)}
                    className="shrink-0 whitespace-nowrap text-[12px] leading-[18px] text-danger px-2 py-1 flex items-center justify-center"
                  >
                    삭제
                  </button>
                </div>
              );
            }

            return (
              <div key={entry.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] leading-[20px] font-semibold text-text2 w-[40px]">{entry.currency}</span>
                  <span className="text-[13px] leading-[20px] text-text3">{rem.toLocaleString()}</span>
                  {spent > 0 && (
                    <span className="text-[11px] leading-[17px] text-text4">(-{spent.toLocaleString()})</span>
                  )}
                </div>
                <span className="text-[13px] leading-[20px] font-semibold text-text1">{formatKRW(krw)}원</span>
              </div>
            );
          })}
          {cashEntries.length === 0 && !cashFormOpen && (
            <div className="text-[12px] leading-[18px] text-text4 text-center py-2">보유 현금을 등록해 보세요</div>
          )}
        </div>

        {cashFormOpen && (
          <div className="mt-3 pt-3 border-t border-[#f0f1f3]">
            <div className="flex gap-2 mb-3">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setAddCur(c)}
                  className={`flex-1 py-[7px] rounded-lg text-[12px] leading-[18px] font-semibold transition-all flex items-center justify-center ${addCur === c ? "bg-action text-white" : "bg-[#f2f3f7] text-text3"
                    }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <input type="number" inputMode="decimal" value={addAmt} onChange={(e) => setAddAmt(e.target.value)} placeholder="금액" className="flex-1 px-3 py-[10px] border border-border rounded-lg text-[14px] leading-[21px] outline-none" />
              <input type="text" value={addMemo} onChange={(e) => setAddMemo(e.target.value)} placeholder="메모" className="flex-1 px-3 py-[10px] border border-border rounded-lg text-[14px] leading-[21px] outline-none" />
            </div>
            <button onClick={handleAddCash} disabled={!addAmt} className={`w-full py-3 rounded-xl text-[14px] leading-[21px] font-semibold transition-all flex items-center justify-center ${addAmt ? "bg-action text-white" : "bg-[#e8eaef] text-text4"}`}>
              등록
            </button>
          </div>
        )}
      </div>

      {/* ── 남은 정산 ── */}
      {myBalance && (
        <div className="mx-4 bg-white rounded-2xl px-5 py-4">
          <div className={sectionHeader}>
            <span className={sectionTitle}>남은 정산</span>
            <span
              className="text-[12px] leading-[18px] font-semibold"
              style={{ color: myBalance.balance >= 0 ? "#03b26c" : "#f04452" }}
            >
              {myBalance.balance > 10 ? "받을 금액 있음" : myBalance.balance < -10 ? "보낼 금액 있음" : "완료"}
            </span>
          </div>
          <div
            className="text-[22px] leading-[31px] font-bold mb-3"
            style={{ color: myBalance.balance >= 0 ? "#03b26c" : "#f04452" }}
          >
            {formatKRW(Math.abs(myBalance.balance))}원
          </div>
          {mySettlements.length > 0 && (
            <div className="flex flex-col gap-[8px]">
              {mySettlements.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[13px] leading-[20px] text-text2">
                    {s.from === currentUser
                      ? `${s.to}에게 보낼 금액`
                      : `${s.from}이 나에게 줄 금액`}
                  </span>
                  <span
                    className="text-[13px] leading-[20px] font-semibold"
                    style={{ color: s.from === currentUser ? "#f04452" : "#03b26c" }}
                  >
                    {formatKRW(s.amount)}원
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 예산 ── */}
      <div className="mx-4 bg-white rounded-2xl px-5 py-4">
        <div className={sectionHeader}>
          <span className={sectionTitle}>예산</span>
          <button
            onClick={() => {
              if (editBudget) { saveBudget(); } else { setEditBudget(true); setBudgetInput(String(budget)); }
            }}
            className={`${actionBtn} ${editBudget ? "text-action border border-action/20" : "text-text4 border border-border"}`}
          >
            {editBudget ? "저장" : "편집"}
          </button>
        </div>
        {editBudget ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="flex-1 px-3 py-[10px] border border-border rounded-lg text-[16px] leading-[24px] font-semibold outline-none"
              autoFocus
            />
            <span className="text-[14px] leading-[21px] font-semibold text-text3 shrink-0">원</span>
          </div>
        ) : budget > 0 ? (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[22px] leading-[31px] font-bold text-text1">{formatKRW(budget)}원</span>
              <span className="text-[12px] leading-[18px] text-text4">{budgetPct}% 사용</span>
            </div>
            <div className="h-[6px] bg-[#f0f1f3] rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${budgetPct}%`,
                  background: budgetPct > 80 ? "#f04452" : budgetPct > 50 ? "#fe9800" : "#03b26c",
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] leading-[20px] text-text3">남은 예산</span>
              <span
                className="text-[14px] leading-[21px] font-bold"
                style={{ color: remaining >= 0 ? "#03b26c" : "#f04452" }}
              >
                {formatKRW(remaining)}원
              </span>
            </div>
          </>
        ) : (
          <div className="text-[12px] leading-[18px] text-text4 text-center py-2">예산을 설정해 보세요</div>
        )}
      </div>

      <div className="h-2" />
    </div>
  );
}
