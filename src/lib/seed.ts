import { getMeta, removeItemRaw, setMeta } from "./idb";
import { isSupabaseConfigured, supabase } from "./supabase";

const MOCK_EXPENSE_IDS = [
  "e01", "e02", "e03", "e04", "e05", "e06", "e07", "e08", "e09",
  "e10", "e11", "e12", "e13", "e14", "e15", "e16", "e17", "e18",
];
const MOCK_TRANSFER_IDS = ["t01", "t02", "t03", "t04", "t05"];
const MOCK_CASH_IDS = ["c01", "c02", "c03", "c04"];

const CLEANUP_FLAG = "mock_cleanup_v2";

async function deleteRemote(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return true;

  const expensesRes = await supabase
    .from("expenses")
    .delete()
    .in("id", MOCK_EXPENSE_IDS);
  if (expensesRes.error) {
    console.error("Mock cleanup: remote expenses delete failed:", expensesRes.error.message);
    return false;
  }

  const transfersRes = await supabase
    .from("transfers")
    .delete()
    .in("id", MOCK_TRANSFER_IDS);
  if (transfersRes.error) {
    console.error("Mock cleanup: remote transfers delete failed:", transfersRes.error.message);
    return false;
  }

  const cashRes = await supabase
    .from("cash")
    .delete()
    .in("id", MOCK_CASH_IDS);
  if (cashRes.error) {
    console.error("Mock cleanup: remote cash delete failed:", cashRes.error.message);
    return false;
  }

  return true;
}

async function deleteLocal(): Promise<void> {
  await Promise.all([
    ...MOCK_EXPENSE_IDS.map((id) => removeItemRaw("expenses", id)),
    ...MOCK_TRANSFER_IDS.map((id) => removeItemRaw("transfers", id)),
    ...MOCK_CASH_IDS.map((id) => removeItemRaw("cash", id)),
  ]);
}

export async function cleanupMockData(): Promise<void> {
  if (await getMeta(CLEANUP_FLAG)) return;

  const remoteOk = await deleteRemote();
  await deleteLocal();

  if (remoteOk) {
    await setMeta(CLEANUP_FLAG, new Date().toISOString());
  }
}
