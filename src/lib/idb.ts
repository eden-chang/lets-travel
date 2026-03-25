import { openDB, IDBPDatabase } from "idb";
import type { Expense, Transfer, CashEntry } from "../types";

export type SyncStore = "expenses" | "transfers";
type DataStore = SyncStore | "cash";

interface SyncQueueEntry {
  queueId?: number;
  table: SyncStore;
  data: Expense | Transfer;
  created_at: string;
}

interface MetaRecord {
  key: string;
  value: string;
}

interface TravelExpenseDB {
  expenses: {
    key: string;
    value: Expense;
  };
  transfers: {
    key: string;
    value: Transfer;
  };
  cash: {
    key: string;
    value: CashEntry;
  };
  sync_queue: {
    key: number;
    value: SyncQueueEntry;
  };
  meta: {
    key: string;
    value: MetaRecord;
  };
}

const DB_NAME = "travel-expense-tracker";
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<TravelExpenseDB>> | null = null;

function getDB(): Promise<IDBPDatabase<TravelExpenseDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TravelExpenseDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("expenses", { keyPath: "id" });
          db.createObjectStore("sync_queue", {
            keyPath: "queueId",
            autoIncrement: true,
          });
          db.createObjectStore("meta", { keyPath: "key" });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("transfers")) {
            db.createObjectStore("transfers", { keyPath: "id" });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("cash")) {
            db.createObjectStore("cash", { keyPath: "id" });
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllItems(store: "expenses"): Promise<Expense[]>;
export async function getAllItems(store: "transfers"): Promise<Transfer[]>;
export async function getAllItems(store: "cash"): Promise<CashEntry[]>;
export async function getAllItems(store: DataStore): Promise<(Expense | Transfer | CashEntry)[]> {
  const db = await getDB();
  const all = await db.getAll(store);
  return (all as Array<Expense | Transfer>).filter((item) => !item.deleted) as Expense[] | Transfer[];
}

export async function getAllItemsRaw(store: "expenses"): Promise<Expense[]>;
export async function getAllItemsRaw(store: "transfers"): Promise<Transfer[]>;
export async function getAllItemsRaw(store: "cash"): Promise<CashEntry[]>;
export async function getAllItemsRaw(store: DataStore): Promise<(Expense | Transfer | CashEntry)[]>;
export async function getAllItemsRaw(store: DataStore): Promise<(Expense | Transfer | CashEntry)[]> {
  const db = await getDB();
  return db.getAll(store) as Promise<Expense[] | Transfer[]>;
}

export async function putItem(store: "expenses", item: Expense): Promise<Expense>;
export async function putItem(store: "transfers", item: Transfer): Promise<Transfer>;
export async function putItem(store: "cash", item: CashEntry): Promise<CashEntry>;
export async function putItem(
  store: DataStore,
  item: Expense | Transfer | CashEntry
): Promise<Expense | Transfer | CashEntry> {
  const db = await getDB();
  const record = {
    ...item,
    updated_at: new Date().toISOString(),
    deleted: item.deleted ?? false,
  };
  await db.put(store, record as Expense & Transfer);
  return record;
}

export async function softDeleteItem(store: "expenses", id: string): Promise<Expense | null>;
export async function softDeleteItem(store: "transfers", id: string): Promise<Transfer | null>;
export async function softDeleteItem(store: "cash", id: string): Promise<CashEntry | null>;
export async function softDeleteItem(
  store: DataStore,
  id: string
): Promise<Expense | Transfer | CashEntry | null> {
  const db = await getDB();
  const item = await db.get(store, id);
  if (!item) return null;
  const record = {
    ...item,
    deleted: true,
    updated_at: new Date().toISOString(),
  };
  await db.put(store, record as Expense & Transfer);
  return record;
}

export async function mergeRemoteItem(
  store: DataStore,
  remoteItem: Expense | Transfer
): Promise<boolean> {
  const db = await getDB();
  const local = await db.get(store, remoteItem.id);
  if (
    !local ||
    new Date(remoteItem.updated_at ?? 0) >= new Date(local.updated_at ?? 0)
  ) {
    await db.put(store, remoteItem as Expense & Transfer);
    return true;
  }
  return false;
}

export async function addToSyncQueue(
  entry: Omit<SyncQueueEntry, "created_at" | "queueId">
): Promise<void> {
  const db = await getDB();
  await db.add("sync_queue", {
    ...entry,
    created_at: new Date().toISOString(),
  } as SyncQueueEntry);
}

export async function getAllSyncQueue(): Promise<SyncQueueEntry[]> {
  const db = await getDB();
  return db.getAll("sync_queue");
}

export async function clearSyncQueueItem(queueId: number): Promise<void> {
  const db = await getDB();
  await db.delete("sync_queue", queueId);
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDB();
  const row = await db.get("meta", key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put("meta", { key, value });
}
