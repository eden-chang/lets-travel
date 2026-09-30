// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

const auth = {
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
};
const rpc = vi.fn();

vi.mock("./supabase", () => ({
  supabase: { auth, rpc },
  isSupabaseConfigured: () => true,
}));

const { resolveTripAccess, joinTrip } = await import("./access");

function withSession(userId: string | null) {
  auth.getSession.mockResolvedValue({
    data: { session: userId ? { user: { id: userId } } : null },
    error: null,
  });
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", { value: online, configurable: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  localStorage.clear();
  setOnline(true);
});

describe("resolveTripAccess", () => {
  it("signs in anonymously and asks for an invite when not a member", async () => {
    withSession(null);
    auth.signInAnonymously.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(resolveTripAccess()).resolves.toBe("needs-invite");
    expect(auth.signInAnonymously).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("is_trip_member");
  });

  it("grants access and caches membership when the server confirms it", async () => {
    withSession("u1");
    rpc.mockResolvedValue({ data: true, error: null });

    await expect(resolveTripAccess()).resolves.toBe("member");
    expect(localStorage.getItem("tripMemberUserId")).toBe("u1");
  });

  it("re-checks membership online and clears a revoked member's cache", async () => {
    localStorage.setItem("tripMemberUserId", "u1");
    withSession("u1");
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(resolveTripAccess()).resolves.toBe("needs-invite");
    expect(localStorage.getItem("tripMemberUserId")).toBeNull();
  });

  it("keeps a cached member in the app when the network is flaky", async () => {
    localStorage.setItem("tripMemberUserId", "u1");
    withSession("u1");
    rpc.mockResolvedValue({ data: null, error: { message: "network" } });
    await expect(resolveTripAccess()).resolves.toBe("member");

    auth.getSession.mockResolvedValue({ data: { session: null }, error: { message: "refresh failed" } });
    await expect(resolveTripAccess()).resolves.toBe("member");
  });

  it("creates only one anonymous user for concurrent calls", async () => {
    withSession(null);
    auth.signInAnonymously.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    rpc.mockResolvedValue({ data: false, error: null });

    await Promise.all([resolveTripAccess(), resolveTripAccess()]);
    expect(auth.signInAnonymously).toHaveBeenCalledOnce();
  });

  it("does not trust a cached membership that belongs to another user", async () => {
    localStorage.setItem("tripMemberUserId", "someone-else");
    withSession("u1");
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(resolveTripAccess()).resolves.toBe("needs-invite");
  });

  it("keeps cached members working offline and blocks first-time users", async () => {
    setOnline(false);
    await expect(resolveTripAccess()).resolves.toBe("offline");

    localStorage.setItem("tripMemberUserId", "u1");
    await expect(resolveTripAccess()).resolves.toBe("member");
    expect(auth.getSession).not.toHaveBeenCalled();
  });

  it("reports an error when the membership check fails", async () => {
    withSession("u1");
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(resolveTripAccess()).resolves.toBe("error");
  });
});

describe("joinTrip", () => {
  it("rejects blank codes without calling the server", async () => {
    await expect(joinTrip("   ")).resolves.toBe("invalid");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends the trimmed code and caches membership on success", async () => {
    withSession("u1");
    rpc.mockResolvedValue({ data: "joined", error: null });

    await expect(joinTrip("  secret-code ")).resolves.toBe("joined");
    expect(rpc).toHaveBeenCalledWith("join_trip", { invite_code: "secret-code" });
    expect(localStorage.getItem("tripMemberUserId")).toBe("u1");
  });

  it.each(["invalid", "rate_limited"] as const)("passes through the %s result", async (result) => {
    withSession("u1");
    rpc.mockResolvedValue({ data: result, error: null });

    await expect(joinTrip("code")).resolves.toBe(result);
    expect(localStorage.getItem("tripMemberUserId")).toBeNull();
  });

  it("treats unexpected server responses as errors", async () => {
    withSession("u1");
    rpc.mockResolvedValue({ data: "something-else", error: null });

    await expect(joinTrip("code")).resolves.toBe("error");
  });
});
