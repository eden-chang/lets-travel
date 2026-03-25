import { useState, useEffect, useCallback, useRef } from "react";
import { getAllItems, putItem, softDeleteItem, mergeRemoteItem } from "../lib/idb";
import {
  syncToRemote,
  flushSyncQueue,
  pullFromRemote,
  pushAllToRemote,
  subscribeToChanges,
} from "../lib/sync";
import { isSupabaseConfigured } from "../lib/supabase";
import { seedIfEmpty } from "../lib/seed";
import type { Expense, Transfer, CashEntry, SyncStatus } from "../types";

interface UseDataReturn {
  expenses: Expense[];
  transfers: Transfer[];
  cashEntries: CashEntry[];
  ready: boolean;
  syncStatus: SyncStatus;
  saveExpense: (item: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  saveTransfer: (item: Transfer) => Promise<void>;
  deleteTransfer: (id: string) => Promise<void>;
  saveCash: (item: CashEntry) => Promise<void>;
  deleteCash: (id: string) => Promise<void>;
}

export function useData(): UseDataReturn {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const initialSyncDone = useRef<boolean>(false);

  const reloadFromIDB = useCallback(async () => {
    const [e, t, c] = await Promise.all([
      getAllItems("expenses"),
      getAllItems("transfers"),
      getAllItems("cash"),
    ]);
    setExpenses(e);
    setTransfers(t);
    setCashEntries(c);
  }, []);

  useEffect(() => {
    seedIfEmpty().then(() => reloadFromIDB()).then(() => setReady(true));
  }, [reloadFromIDB]);

  useEffect(() => {
    if (!ready || initialSyncDone.current || !isSupabaseConfigured()) return;
    initialSyncDone.current = true;

    (async () => {
      if (!navigator.onLine) {
        setSyncStatus("offline");
        return;
      }

      setSyncStatus("syncing");
      try {
        await flushSyncQueue();
        await pushAllToRemote();
        const changed = await pullFromRemote();
        if (changed) await reloadFromIDB();
        setSyncStatus("online");
      } catch (err) {
        console.error("Initial sync failed:", err);
        setSyncStatus("error");
      }
    })();
  }, [ready, reloadFromIDB]);

  useEffect(() => {
    if (!ready || !isSupabaseConfigured()) return;

    const unsubscribe = subscribeToChanges(async (table, remoteItem) => {
      const merged = await mergeRemoteItem(table, remoteItem);
      if (merged) await reloadFromIDB();
    });

    return unsubscribe;
  }, [ready, reloadFromIDB]);

  useEffect(() => {
    const handleOnline = async () => {
      setSyncStatus("syncing");
      try {
        await flushSyncQueue();
        const changed = await pullFromRemote();
        if (changed) await reloadFromIDB();
        setSyncStatus("online");
      } catch {
        setSyncStatus("error");
      }
    };

    const handleOffline = () => setSyncStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) setSyncStatus("offline");

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [reloadFromIDB]);

  const saveExpense = useCallback(
    async (item: Expense): Promise<void> => {
      const record = await putItem("expenses", item);
      await reloadFromIDB();
      syncToRemote("expenses", record);
    },
    [reloadFromIDB]
  );

  const deleteExpense = useCallback(
    async (id: string): Promise<void> => {
      const record = await softDeleteItem("expenses", id);
      await reloadFromIDB();
      if (record) syncToRemote("expenses", record);
    },
    [reloadFromIDB]
  );

  const saveTransfer = useCallback(
    async (item: Transfer): Promise<void> => {
      const record = await putItem("transfers", item);
      await reloadFromIDB();
      syncToRemote("transfers", record);
    },
    [reloadFromIDB]
  );

  const deleteTransfer = useCallback(
    async (id: string): Promise<void> => {
      const record = await softDeleteItem("transfers", id);
      await reloadFromIDB();
      if (record) syncToRemote("transfers", record);
    },
    [reloadFromIDB]
  );

  const saveCash = useCallback(
    async (item: CashEntry): Promise<void> => {
      await putItem("cash", item);
      await reloadFromIDB();
    },
    [reloadFromIDB]
  );

  const deleteCash = useCallback(
    async (id: string): Promise<void> => {
      await softDeleteItem("cash", id);
      await reloadFromIDB();
    },
    [reloadFromIDB]
  );

  return {
    expenses,
    transfers,
    cashEntries,
    ready,
    syncStatus,
    saveExpense,
    deleteExpense,
    saveTransfer,
    deleteTransfer,
    saveCash,
    deleteCash,
  };
}
