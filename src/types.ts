export type PaymentMethod = "card" | "cash";

export interface ExpenseSplit {
  member: string;
  amount: number;
  memo: string;
}

export interface Expense {
  id: string;
  date: string;
  city: string;
  category: string;
  desc: string;
  currency: string;
  amount: number;
  krw: number;
  payer: string;
  members: string[];
  method: PaymentMethod;
  splitMode?: boolean;
  sharedAmount?: number;
  splits?: ExpenseSplit[];
  updated_at?: string;
  deleted?: boolean;
}

export interface Transfer {
  id: string;
  type: "deposit" | "settlement" | "cash_exchange";
  from: string;
  to: string;
  amount: number;
  currency?: string;
  date: string;
  memo: string;
  updated_at?: string;
  deleted?: boolean;
}

export interface CashEntry {
  id: string;
  currency: string;
  amount: number;
  memo: string;
  date: string;
  updated_at?: string;
  deleted?: boolean;
}

export interface MemberBalance {
  owes: number;
  paid: number;
  transferred: number;
  received: number;
  balance: number;
}

export interface SettleEntry {
  from: string;
  to: string;
  amount: number;
}

export interface Settlement {
  totalKRW: number;
  perMember: Record<string, MemberBalance>;
  settlements: SettleEntry[];
  remaining: SettleEntry[];
  remainCount: number;
  remainTotal: number;
  totalTransferred: number;
  byCategory: Record<string, number>;
  byCity: Record<string, number>;
}

export type SyncStatus = "idle" | "syncing" | "online" | "offline" | "error";

export type TransferType = "deposit" | "settlement" | "cash_exchange";

export type ViewKey = "wallet" | "list" | "settle" | "transfer" | "stats";
