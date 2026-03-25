import { supabase, isSupabaseConfigured } from "./supabase";
import {
  getAllItemsRaw,
  mergeRemoteItem,
  addToSyncQueue,
  getAllSyncQueue,
  clearSyncQueueItem,
  setMeta,
} from "./idb";
import type { Expense, Transfer } from "../types";
import type { SyncStore } from "./idb";

type DataStore = SyncStore;
type OnRemoteChange = (table: DataStore, item: Expense | Transfer) => void;

interface TransferRemoteRecord extends Omit<Transfer, "from" | "to"> {
  from_member: string;
  to_member: string;
}

const TABLES: SyncStore[] = ["expenses", "transfers"];

function toRemoteRecord(
  table: DataStore,
  local: Expense | Transfer
): Record<string, unknown> {
  if (table === "transfers") {
    const { from, to, ...rest } = local as Transfer;
    return { ...rest, from_member: from, to_member: to };
  }
  if (table === "expenses") {
    const e = local as Expense;
    return {
      ...e,
      method: e.method ?? "card",
      split_mode: e.splitMode ?? false,
      shared_amount: e.sharedAmount ?? null,
      splits: e.splits ? JSON.stringify(e.splits) : null,
      // remove camelCase fields that don't exist in DB
      splitMode: undefined,
      sharedAmount: undefined,
    };
  }
  return { ...local };
}

function toLocalRecord(
  table: DataStore,
  remote: Record<string, unknown>
): Expense | Transfer {
  if (table === "transfers") {
    const { from_member, to_member, ...rest } = remote as Record<string, unknown> & {
      from_member: string;
      to_member: string;
    };
    return { ...rest, from: from_member, to: to_member } as Transfer;
  }
  if (table === "expenses") {
    const r = remote as Record<string, unknown>;
    return {
      ...r,
      method: r.method ?? "card",
      splitMode: r.split_mode ?? false,
      sharedAmount: r.shared_amount ?? undefined,
      splits: typeof r.splits === "string" ? JSON.parse(r.splits as string) : r.splits ?? undefined,
    } as unknown as Expense;
  }
  return { ...remote } as unknown as Expense;
}

async function pushToSupabase(
  table: DataStore,
  record: Expense | Transfer
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const remoteRecord = toRemoteRecord(table, record);
  const { error } = await supabase.from(table).upsert(remoteRecord, {
    onConflict: "id",
  });

  if (error) {
    console.error(`Supabase upsert failed [${table}]:`, error.message);
    return false;
  }
  return true;
}

export async function syncToRemote(
  table: DataStore,
  record: Expense | Transfer
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const ok = await pushToSupabase(table, record);
  if (!ok) {
    await addToSyncQueue({ table, data: record });
  }
}

export async function flushSyncQueue(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const queue = await getAllSyncQueue();
  for (const entry of queue) {
    const ok = await pushToSupabase(entry.table, entry.data);
    if (ok) {
      await clearSyncQueueItem(entry.queueId!);
    } else {
      break;
    }
  }
}

export async function pullFromRemote(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  let changed = false;

  for (const table of TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error(`Supabase pull failed [${table}]:`, error.message);
      continue;
    }

    for (const remoteRow of data) {
      const localRow = toLocalRecord(table, remoteRow as Record<string, unknown>);
      const merged = await mergeRemoteItem(table, localRow);
      if (merged) changed = true;
    }
  }

  if (changed) {
    await setMeta("last_sync", new Date().toISOString());
  }
  return changed;
}

export async function pushAllToRemote(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  for (const table of TABLES) {
    const items = await getAllItemsRaw(table) as (Expense | Transfer)[];
    if (items.length === 0) continue;

    const remoteRecords = items.map((item) => toRemoteRecord(table, item));
    const { error } = await supabase.from(table).upsert(remoteRecords, {
      onConflict: "id",
    });

    if (error) {
      console.error(`Supabase bulk push failed [${table}]:`, error.message);
    }
  }
}

export function subscribeToChanges(onRemoteChange: OnRemoteChange): () => void {
  if (!isSupabaseConfigured() || !supabase) return () => {};

  const channel = supabase
    .channel("db-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "expenses" },
      (payload) => {
        const local = toLocalRecord("expenses", payload.new as Record<string, unknown>);
        onRemoteChange("expenses", local);
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "transfers" },
      (payload) => {
        const local = toLocalRecord("transfers", payload.new as Record<string, unknown>);
        onRemoteChange("transfers", local);
      }
    )
    .subscribe();

  return () => {
    supabase!.removeChannel(channel);
  };
}
