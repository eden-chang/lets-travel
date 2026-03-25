import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { computeSettlement } from "./logic";
import { useData } from "./hooks/useData";
import { useExchangeRates } from "./hooks/useExchangeRates";
import { AddForm } from "./components/AddForm";
import { ExpenseDetail } from "./components/ExpenseDetail";
import { TransferForm } from "./components/TransferForm";
import { ListTab } from "./components/ListTab";
import { SettleTab } from "./components/SettleTab";
import { TransferTab } from "./components/TransferTab";
import { StatsTab } from "./components/StatsTab";
import { WalletTab } from "./components/WalletTab";
import { Icon } from "./components/Icon";
import type { Expense, Transfer, Settlement, ViewKey } from "./types";
import { TAB_COLORS, MEMBERS, TRIP } from "./constants";

interface ToastState {
  msg: string;
  show: boolean;
}

interface TabConfig {
  key: ViewKey;
  icon: string;
  label: string;
}

const TABS: TabConfig[] = [
  { key: "wallet", icon: "wallet", label: "내 지갑" },
  { key: "list", icon: "shop", label: "지출" },
  { key: "settle", icon: "bill", label: "정산" },
  { key: "transfer", icon: "send", label: "송금" },
  { key: "stats", icon: "chart", label: "통계" },
];

// 탭 아이콘 SVG 프리로드 (깜빡임 방지)
if (typeof window !== "undefined") {
  TABS.forEach((t) => {
    new Image().src = `/svg/${t.icon}-fill.svg`;
    new Image().src = `/svg/${t.icon}-line.svg`;
  });
}

export function App() {
  const {
    expenses,
    transfers,
    cashEntries,
    ready,
    saveExpense,
    deleteExpense,
    saveTransfer,
    deleteTransfer,
    saveCash,
    deleteCash,
  } = useData();

  const { rates, updatedAt: ratesUpdatedAt } = useExchangeRates();

  const [view, setView] = useState<ViewKey>("wallet");
  const [currentUser, setCurrentUser] = useState<string | null>(() =>
    localStorage.getItem("currentUser")
  );
  const [budget, setBudgetState] = useState<number>(() =>
    Number(localStorage.getItem(`budget_${localStorage.getItem("currentUser")}`)) || 0
  );
  const [addOpen, setAddOpen] = useState(false);
  const [transferFormOpen, setTransferFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [detailItem, setDetailItem] = useState<Expense | null>(null);
  const [editTransfer, setEditTransfer] = useState<Transfer | null>(null);
  // 스와이프: state 대신 ref + 직접 DOM 조작 (리렌더 방지)
  const mainWrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleDragProgress = useCallback((progress: number) => {
    const wrap = mainWrapRef.current;
    const overlay = overlayRef.current;
    if (wrap) {
      const x = -60 + progress * 60;
      wrap.style.transform = `translateX(${x}px)`;
      wrap.style.transition = progress > 0 && progress < 1 ? "none" : "transform 0.28s cubic-bezier(0.2,0.9,0.3,1)";
    }
    if (overlay) {
      overlay.style.opacity = String(0.15 * (1 - progress));
      overlay.style.transition = progress > 0 && progress < 1 ? "none" : "opacity 0.28s ease";
    }
  }, []);
  const [toast, setToast] = useState<ToastState>({ msg: "", show: false });

  const handleSetUser = useCallback((user: string) => {
    setCurrentUser(user);
    localStorage.setItem("currentUser", user);
    setBudgetState(Number(localStorage.getItem(`budget_${user}`)) || 0);
  }, []);

  const handleSetBudget = useCallback((val: number) => {
    setBudgetState(val);
    if (currentUser) localStorage.setItem(`budget_${currentUser}`, String(val));
  }, [currentUser]);

  useEffect(() => {
    document.documentElement.style.setProperty("--th", TAB_COLORS[view]);
  }, [view]);

  const flash = useCallback((msg: string) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2000);
  }, []);

  const handleAdd = useCallback(
    (item: Expense) => {
      saveExpense(item);
      setEditItem(null);
    },
    [saveExpense]
  );

  const handleFab = useCallback(() => {
    if (view === "list") {
      setEditItem(null);
      setAddOpen(true);
    } else if (view === "transfer") {
      setTransferFormOpen(true);
    }
  }, [view]);

  const settlement = useMemo<Settlement>(
    () => computeSettlement(expenses, transfers),
    [expenses, transfers]
  );


  const showFab = (view === "list" || view === "transfer") && !addOpen && !transferFormOpen && !detailItem;

  const mainRef = useRef<HTMLElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const handleScroll = useCallback(() => {
    const el = mainRef.current;
    if (!el) return;
    el.classList.add("scrolling");
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      el.classList.remove("scrolling");
    }, 800);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text4">
        불러오는 중...
      </div>
    );
  }

  if (!currentUser) {
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

          <div className="text-[14px] leading-[21px] text-text2 text-center mb-5">누구로 접속할까요?</div>

          <div className="flex flex-col gap-3">
            {MEMBERS.map((m) => (
              <button
                key={m}
                onClick={() => handleSetUser(m)}
                className="w-full py-4 bg-white rounded-2xl text-[16px] leading-[24px] font-semibold text-text1 transition-all flex items-center justify-center"
                style={{ outline: "0.5px solid #e5e7eb" }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto flex flex-col h-dvh overflow-hidden"
      style={{ maxWidth: "390px", borderLeft: "1px solid #d1d5db", borderRight: "1px solid #d1d5db" }}
    >
      {/* 메인 콘텐츠 래퍼 */}
      <div
        ref={mainWrapRef}
        className="flex flex-col flex-1 overflow-hidden"
        style={{
          transform: (addOpen || transferFormOpen || !!detailItem) ? "translateX(-60px)" : "translateX(0)",
          transition: "transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)",
        }}
      >
      {/* Top safe area spacer */}
      <div
        className="shrink-0"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 20px), 20px)",
          background: "#F2F4F6",
        }}
      />

      {/* Content */}
      <main
        ref={mainRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scroll"
        style={{
          background: "#F2F4F6",
          paddingBottom: "calc(62px + env(safe-area-inset-bottom, 0px) + 12px)",
        }}
      >
        <div key={view} style={{ animation: "tabFadeIn 0.18s ease both" }}>
        {view === "wallet" && (
          <WalletTab
            settlement={settlement}
            expenses={expenses}
            transfers={transfers}
            cashEntries={cashEntries}
            saveCash={saveCash}
            deleteCash={deleteCash}
            rates={rates}
            ratesUpdatedAt={ratesUpdatedAt}
            currentUser={currentUser}
            budget={budget}
            setBudget={handleSetBudget}
          />
        )}
        {view === "list" && (
          <ListTab
            exp={expenses}
            currentUser={currentUser}
            rates={rates}
            ratesUpdatedAt={ratesUpdatedAt}
            onDel={(id: string) => {
              deleteExpense(id);
              flash("삭제했어요");
            }}
            onEdit={(it: Expense) => {
              setDetailItem(it);
            }}
          />
        )}
        {view === "settle" && <SettleTab settlement={settlement} />}
        {view === "transfer" && (
          <TransferTab
            transfers={transfers}
            saveTransfer={saveTransfer}
            deleteTransfer={deleteTransfer}
            onToast={flash}
            onAdd={() => { setEditTransfer(null); setTransferFormOpen(true); }}
            onEdit={(t: Transfer) => { setEditTransfer(t); setTransferFormOpen(true); }}
          />
        )}
        {view === "stats" && (
          <StatsTab settlement={settlement} expenses={expenses} currentUser={currentUser ?? undefined} />
        )}
        </div>
      </main>
      </div>
      {/* 메인 래퍼 끝 */}

      {/* 검은 오버레이 — addOpen 시 */}
      <div
        ref={overlayRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
          opacity: (addOpen || transferFormOpen || !!detailItem) ? 0.15 : 0,
          pointerEvents: "none",
          transition: "opacity 0.28s ease",
          zIndex: 35,
        }}
      />

      {/* Bottom Tab Bar — 항상 최상위 */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-white flex flex-col rounded-tl-2xl rounded-tr-2xl"
        style={{ outline: "0.5px solid #e5e7eb", maxWidth: "390px", zIndex: 60, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch pt-[6px] pb-[2px]">
          {TABS.map((tab) => {
            const active = view === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setView(tab.key);
                  setAddOpen(false); setEditItem(null); setDetailItem(null);
                  setTransferFormOpen(false); setEditTransfer(null);
                }}
                aria-label={tab.label}
                aria-pressed={active}
                className="flex-1 flex flex-col items-center justify-center gap-[2px] py-1 transition-colors"
                style={{ color: active ? "var(--th)" : "#9ca3af" }}
              >
                <span
                  className="relative leading-none"
                  style={{ width: 20, height: 20, transform: active ? "scale(1.15)" : "scale(1)", transition: "transform 0.15s ease" }}
                >
                  <Icon
                    name={tab.icon}
                    variant="line"
                    size={20}
                    className="absolute inset-0"
                    style={{ opacity: active ? 0 : 1, transition: "opacity 0.15s ease" }}
                  />
                  <Icon
                    name={tab.icon}
                    variant="fill"
                    size={20}
                    className="absolute inset-0"
                    style={{ opacity: active ? 1 : 0, transition: "opacity 0.15s ease" }}
                  />
                </span>
                <span className="text-[11px] font-light leading-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB — 항상 최상위 */}
      {showFab && (
        <button
          onClick={handleFab}
          aria-label="추가"
          className="press-fab fixed w-[52px] h-[52px] rounded-full text-white text-[26px] font-light flex items-center justify-center"
          style={{ bottom: "calc(74px + env(safe-area-inset-bottom, 0px) + 12px)", right: "16px", background: "var(--th)", zIndex: 60 }}
        >
          +
        </button>
      )}

      {/* ExpenseDetail — 조회 */}
      {detailItem && (
        <ExpenseDetail
          item={detailItem}
          onEdit={() => {
            setEditItem(detailItem);
            setDetailItem(null);
            setAddOpen(true);
          }}
          onDel={(id) => {
            deleteExpense(id);
            setDetailItem(null);
          }}
          onClose={() => setDetailItem(null)}
          onToast={flash}
          onDragProgress={handleDragProgress}
        />
      )}

      {/* AddForm — 편집 */}
      {addOpen && (
        <AddForm
          onAdd={handleAdd}
          onDel={(id) => { deleteExpense(id); setAddOpen(false); setEditItem(null); }}
          editItem={editItem}
          onClose={() => {
            setAddOpen(false);
            setEditItem(null);
          }}
          onDragProgress={handleDragProgress}
          onToast={flash}
          rates={rates}
          ratesUpdatedAt={ratesUpdatedAt}
        />
      )}

      {/* TransferForm */}
      {transferFormOpen && (
        <TransferForm
          onSave={(item) => { saveTransfer(item); setTransferFormOpen(false); setEditTransfer(null); }}
          onDel={(id) => { deleteTransfer(id); setTransferFormOpen(false); setEditTransfer(null); }}
          editItem={editTransfer}
          onClose={() => { setTransferFormOpen(false); setEditTransfer(null); }}
          onDragProgress={handleDragProgress}
          onToast={flash}
          currentUser={currentUser ?? undefined}
        />
      )}

      {/* Toast */}
      {toast.show && (
        <div
          role="status"
          className="fixed left-1/2 -translate-x-1/2 bottom-[100px] z-50 bg-[#191f28]/90 text-white text-[13px] leading-[20px] font-medium px-4 py-[10px] rounded-[20px] pointer-events-none"
          style={{ animation: "fadeInOut 2s ease forwards" }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
