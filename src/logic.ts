import { MEMBERS } from "./constants";
import type { Expense, Transfer, Settlement, SettleEntry, MemberBalance } from "./types";

const THRESHOLD = 10;

interface MemberAmount {
  name: string;
  amount: number;
}

function splitAmount(total: number, members: string[]): Record<string, number> {
  const n = members.length;
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  const shares: Record<string, number> = {};
  members.forEach((m, i) => {
    shares[m] = base + (i < remainder ? 1 : 0);
  });
  return shares;
}

function minSettle(balanceMap: Record<string, number>): SettleEntry[] {
  const debtors: MemberAmount[] = [];
  const creditors: MemberAmount[] = [];

  Object.entries(balanceMap).forEach(([member, balance]) => {
    if (balance < -THRESHOLD) {
      debtors.push({ name: member, amount: -balance });
    } else if (balance > THRESHOLD) {
      creditors.push({ name: member, amount: balance });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const results: SettleEntry[] = [];
  const d = debtors.map((x) => ({ ...x }));
  const c = creditors.map((x) => ({ ...x }));
  let di = 0;
  let ci = 0;

  while (di < d.length && ci < c.length) {
    const transfer = Math.min(d[di].amount, c[ci].amount);
    if (transfer > THRESHOLD) {
      results.push({ from: d[di].name, to: c[ci].name, amount: transfer });
    }
    d[di].amount -= transfer;
    c[ci].amount -= transfer;
    if (d[di].amount < THRESHOLD) di++;
    if (c[ci].amount < THRESHOLD) ci++;
  }

  return results;
}

/**
 * 모든 정산 데이터를 한 번에 계산
 *
 * @param expenses - 지출 목록
 * @param transfers - 송금 목록 (선입금 + 정산 통합)
 */
export function computeSettlement(expenses: Expense[], transfers: Transfer[]): Settlement {
  const totalKRW = expenses.reduce((s, e) => s + e.krw, 0);

  const owes: Record<string, number> = {};
  const paid: Record<string, number> = {};
  const transferred: Record<string, number> = {};
  const received: Record<string, number> = {};
  const expenseBalances: Record<string, number> = {};

  MEMBERS.forEach((m) => {
    owes[m] = 0;
    paid[m] = 0;
    transferred[m] = 0;
    received[m] = 0;
    expenseBalances[m] = 0;
  });

  expenses.forEach((e) => {
    paid[e.payer] += e.krw;
    expenseBalances[e.payer] += e.krw;

    if (e.splitMode && e.splits && e.splits.length > 0) {
      // 상세 분할: 공유 금액 균등 + 개인별 추가
      const sharedKrw = e.sharedAmount ?? 0;
      const sharedMembers = e.members;

      // 공유 금액 분할
      if (sharedKrw > 0 && sharedMembers.length > 0) {
        const sharedShares = splitAmount(sharedKrw, sharedMembers);
        sharedMembers.forEach((m) => {
          owes[m] += sharedShares[m];
          expenseBalances[m] -= sharedShares[m];
        });
      }

      // 개인별 추가 금액
      e.splits.forEach((s) => {
        if (s.amount > 0) {
          owes[s.member] += s.amount;
          expenseBalances[s.member] -= s.amount;
        }
      });
    } else {
      // 기본: 균등 분할
      const shares = splitAmount(e.krw, e.members);
      e.members.forEach((m) => {
        owes[m] += shares[m];
        expenseBalances[m] -= shares[m];
      });
    }
  });

  const settlements = minSettle(expenseBalances);

  const balances: Record<string, number> = { ...expenseBalances };
  transfers.forEach((t) => {
    transferred[t.from] += t.amount;
    received[t.to] += t.amount;
    balances[t.from] += t.amount;
    balances[t.to] -= t.amount;
  });

  const remaining = minSettle(balances);

  const totalTransferred = transfers.reduce((s, t) => s + t.amount, 0);

  const byCategory: Record<string, number> = {};
  expenses.forEach(
    (e) => (byCategory[e.category] = (byCategory[e.category] ?? 0) + e.krw)
  );
  const byCity: Record<string, number> = {};
  expenses.forEach(
    (e) => (byCity[e.city] = (byCity[e.city] ?? 0) + e.krw)
  );

  const perMember: Record<string, MemberBalance> = {};
  MEMBERS.forEach((m) => {
    perMember[m] = {
      owes: owes[m],
      paid: paid[m],
      transferred: transferred[m],
      received: received[m],
      balance: balances[m],
    };
  });

  return {
    totalKRW,
    perMember,
    settlements,
    remaining,
    remainCount: remaining.length,
    remainTotal: remaining.reduce((s, r) => s + r.amount, 0),
    totalTransferred,
    byCategory,
    byCity,
  };
}
