import { EXCHANGE_RATES } from "./constants";
import type { Expense } from "./types";

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * 외화 금액을 원화로 환산
 * @param amount - 외화 금액
 * @param currency - 통화 코드
 * @param rates - 환율 맵 (없으면 상수 기본값 사용)
 */
export function toKRW(
  amount: number,
  currency: string,
  rates?: Record<string, number>
): number {
  const r = rates ?? EXCHANGE_RATES;
  return Math.round(amount * (r[currency] ?? 1));
}

export function formatNumber(n: number | null | undefined): string {
  if (!n && n !== 0) return "0";
  return (
    (n < 0 ? "-" : "") +
    Math.abs(Math.round(n)).toLocaleString("ko-KR")
  );
}

/**
 * 한국식 금액 표기
 * 508000  → "50만 8천"
 * 161700  → "16만 1700"
 * 1000000 → "100만"
 * 2183000 → "218만 3천"
 * 5000    → "5천"
 * 1500    → "1500"
 * 300     → "300"
 * @param n - 원화 금액
 * @returns "원" 미포함
 */
export function formatKRW(n: number): string {
  const abs = Math.abs(Math.round(n));
  const sign = n < 0 ? "-" : "";

  if (abs === 0) return "0";

  const man = Math.floor(abs / 10000);
  const remainder = abs % 10000;

  const parts: string[] = [];

  if (man > 0) parts.push(`${man}만`);

  if (remainder > 0) {
    if (remainder % 1000 === 0) {
      parts.push(`${remainder / 1000}천`);
    } else {
      parts.push(`${remainder}`);
    }
  }

  return sign + parts.join(" ");
}

/**
 * Calculate the KRW amount that a specific user should pay for an expense
 * @param expense - The expense item
 * @param currentUser - The user to calculate the share for
 * @param rates - Exchange rates (optional, uses constants if not provided)
 * @returns The user's share in KRW
 */
export function getMyShareKRW(
  expense: Expense,
  currentUser: string,
  rates?: Record<string, number>
): number {
  // If user is not in the members list, return 0
  if (!expense.members.includes(currentUser)) return 0;

  // Basic split mode: divide total by number of members
  if (!expense.splitMode) {
    return Math.round(expense.krw / expense.members.length);
  }

  // Advanced split mode
  let myShare = 0;

  // Add shared amount portion
  if (expense.sharedAmount != null && expense.sharedAmount > 0) {
    const sharedKRW = toKRW(expense.sharedAmount, expense.currency, rates);
    myShare += Math.round(sharedKRW / expense.members.length);
  }

  // Add individual split amount
  if (expense.splits && expense.splits.length > 0) {
    const mySplit = expense.splits.find((s) => s.member === currentUser);
    if (mySplit && mySplit.amount > 0) {
      myShare += toKRW(mySplit.amount, expense.currency, rates);
    }
  }

  return myShare;
}
