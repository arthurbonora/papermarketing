// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyOperationAlert } from "@paperclipai/shared";
import { OperationAlertsNavItem } from "@/components/OperationAlertsNavItem";
import { queryKeys } from "@/lib/queryKeys";
import { markCachedSession } from "@/lib/cached-session";
import { ApiError } from "@/api/client";
import { isLiveReconciledQuery } from "@/lib/live-reconcile";
import { OperationAlerts } from "./OperationAlerts";

const mock = vi.hoisted(() => ({ get: vi.fn(), getBoardAccess: vi.fn(), getSession: vi.fn(), setBreadcrumbs: vi.fn() }));

vi.mock("@/api/auth", () => ({
  authApi: { getSession: mock.getSession },
}));

vi.mock("@/api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/api/client")>(),
  api: { get: mock.get },
}));
vi.mock("@/api/access", () => ({
  accessApi: { getCurrentBoardAccess: mock.getBoardAccess },
}));
vi.mock("@/api/health", () => ({
  healthApi: { get: vi.fn().mockResolvedValue({ deploymentMode: "authenticated" }) },
}));
vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-1" }),
}));
vi.mock("@/context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mock.setBreadcrumbs }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const startedAt = "2026-11-15T12:00:00.000Z";
const detectedAt = "2026-11-15T12:00:30.000Z";
const resolvedAt = "2026-11-15T12:01:00.000Z";
const alerts: CompanyOperationAlert[] = [
  { id: "one", kind: "secret_write", startedAt, detectedAt, resolvedAt: null },
  { id: "two", kind: "routine_dispatch", startedAt, detectedAt, resolvedAt },
];

describe("Operation alerts", () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let client: QueryClient;

  beforeEach(() => {
    mock.get.mockReset();
    mock.getBoardAccess.mockReset();
    mock.getSession.mockReset();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  });

  afterEach(async () => {
    await act(() => root.unmount());
    client.clear();
    host.remove();
  });

  async function render(role: "admin" | "member", status = "active", deploymentMode = "authenticated") {
    client.setQueryData(queryKeys.health, { deploymentMode });
    client.setQueryData(queryKeys.auth.session, { user: { id: "board-user" } });
    mock.getBoardAccess.mockResolvedValue({
      userId: "board-user",
      source: deploymentMode === "local_trusted" ? "local_implicit" : "session",
      isInstanceAdmin: false,
      companyIds: ["company-1"],
      memberships: [{ companyId: "company-1", membershipRole: role, status }],
    });
    await act(() => root.render(
      <QueryClientProvider client={client}>
        <OperationAlertsNavItem companyId="company-1" NavItem={({ label, badge, badgeTone }) => (
          <span data-testid="nav" data-tone={badgeTone}>{label} {badge}</span>
        )} />
        <OperationAlerts />
      </QueryClientProvider>,
    ));
  }

  it("uses a single company-scoped read, counts all recent alerts, and shows timestamps", async () => {
    mock.get.mockResolvedValue(alerts);
    await render("admin");

    const nav = () => host.querySelector('[data-testid="nav"]');
    await vi.waitFor(() => expect(nav()?.textContent).toBe("Operation alerts 2"));
    expect(nav()?.getAttribute("data-tone")).toBe("warning");
    expect(mock.get).toHaveBeenCalledExactlyOnceWith("/companies/company-1/operation-alerts", { signal: expect.any(AbortSignal) });
    const rows = host.querySelectorAll("li");
    expect(rows[0]?.textContent).toContain("Secret write");
    expect(rows[0]?.textContent).toContain("Still running");
    expect(rows[0]?.querySelectorAll("time")).toHaveLength(2);
    expect(rows[1]?.textContent).toContain("Routine dispatch");
    expect(rows[1]?.textContent).toContain("Ended");
    expect(rows[1]?.querySelector(`time[datetime="${resolvedAt}"]`)).not.toBeNull();
  });

  it("keeps recent ended alerts visible in the navigation with a neutral badge", async () => {
    mock.get.mockResolvedValue(alerts.slice(1));
    await render("admin");

    const nav = () => host.querySelector('[data-testid="nav"]');
    await vi.waitFor(() => expect(nav()?.textContent).toBe("Operation alerts 1"));
    expect(nav()?.getAttribute("data-tone")).toBe("default");
  });

  it("keeps the same navigation node while revalidating the account without showing cached alerts", async () => {
    mock.get.mockResolvedValue(alerts);
    await render("admin");
    await vi.waitFor(() => expect(host.textContent).toContain("Secret write"));
    const nav = host.querySelector('[data-testid="nav"]');
    let finish!: (value: { user: { id: string } }) => void;
    mock.getSession.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    let refresh!: Promise<void>;

    await act(async () => {
      refresh = client.invalidateQueries({ queryKey: queryKeys.auth.session });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.querySelector('[data-testid="nav"]')).toBe(nav);
    expect(nav?.textContent?.trim()).toBe("Operation alerts");
    expect(host.textContent).not.toContain("Secret write");
    expect(mock.get).toHaveBeenCalledTimes(1);
    expect(mock.getBoardAccess).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish({ user: { id: "board-user" } });
      await refresh;
    });
    await vi.waitFor(() => expect(host.textContent).toContain("Secret write"));
    expect(host.querySelector('[data-testid="nav"]')).toBe(nav);
    expect(nav?.textContent).toBe("Operation alerts 2");
  });

  it.each(["signed-out", "unverified"] as const)("hides cached alerts and navigation for a %s session", async (state) => {
    mock.get.mockResolvedValue(alerts);
    await render("admin");
    await vi.waitFor(() => expect(host.textContent).toContain("Secret write"));

    await act(async () => {
      if (state === "unverified") {
        markCachedSession(client);
        mock.getSession.mockResolvedValue({ user: { id: "board-user" } });
        await client.invalidateQueries({ queryKey: queryKeys.auth.session });
      } else {
        client.setQueryData(queryKeys.auth.session, null);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.querySelector('[data-testid="nav"]')).toBeNull();
    expect(host.textContent).not.toContain("Secret write");
    expect(mock.get).toHaveBeenCalledTimes(1);
  });

  it("finishes the access read when a background session refresh confirms the same account", async () => {
    mock.get.mockResolvedValue(alerts);
    let finishAccess!: (value: unknown) => void;
    mock.getBoardAccess.mockReturnValueOnce(new Promise((resolve) => { finishAccess = resolve; }));
    await render("admin");
    let finishSession!: (value: { user: { id: string } }) => void;
    mock.getSession.mockReturnValue(new Promise((resolve) => { finishSession = resolve; }));
    let refresh!: Promise<void>;
    await act(async () => {
      refresh = client.refetchQueries({ queryKey: queryKeys.auth.session });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      finishSession({ user: { id: "board-user" } });
      await refresh;
      finishAccess({
        userId: "board-user", source: "session", isInstanceAdmin: true,
        companyIds: ["company-1"], memberships: [],
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await vi.waitFor(() => expect(host.querySelector('[data-testid="nav"]')?.textContent).toBe("Operation alerts 2"));
    expect(host.textContent).toContain("Secret write");
  });

  it("keeps the navigation stable without starting alert reads during a live reconnect reconcile", async () => {
    mock.get.mockResolvedValue(alerts);
    await render("admin");
    await vi.waitFor(() => expect(host.textContent).toContain("Secret write"));
    const nav = host.querySelector('[data-testid="nav"]');
    let finish!: (value: { user: { id: string } }) => void;
    mock.getSession.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    let refresh!: Promise<void>;

    await act(async () => {
      refresh = client.invalidateQueries({ type: "active", predicate: isLiveReconciledQuery }, { cancelRefetch: false });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    try {
      expect(host.querySelector('[data-testid="nav"]')).toBe(nav);
      expect(nav?.textContent?.trim()).toBe("Operation alerts");
      expect(host.textContent).not.toContain("Secret write");
      expect(mock.get).toHaveBeenCalledTimes(1);
      expect(mock.getBoardAccess).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => {
        finish({ user: { id: "board-user" } });
        await refresh;
      });
    }
    await vi.waitFor(() => expect(host.textContent).toContain("Secret write"));
  });

  it.each(["signed-out", "other-account"] as const)("drops the previous account's alerts when session verification returns %s", async (state) => {
    mock.get.mockResolvedValue(alerts);
    await render("admin");
    await vi.waitFor(() => expect(host.textContent).toContain("Secret write"));
    let finish!: (value: { user: { id: string } } | null) => void;
    mock.getSession.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    let refresh!: Promise<void>;
    await act(async () => {
      refresh = client.invalidateQueries({ queryKey: queryKeys.auth.session });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    mock.getBoardAccess.mockResolvedValue({
      userId: "other", source: "session", isInstanceAdmin: false, companyIds: [], memberships: [],
    });
    await act(async () => {
      finish(state === "signed-out" ? null : { user: { id: "other" } });
      await refresh;
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.querySelector('[data-testid="nav"]')).toBeNull();
    expect(host.textContent).not.toContain("Secret write");
    expect(mock.get).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])("hides cached alert data and navigation after the alerts endpoint denies access with %s", async (status) => {
    mock.get.mockResolvedValue(alerts);
    await render("admin");
    await vi.waitFor(() => expect(host.textContent).toContain("Secret write"));
    mock.get.mockRejectedValue(new ApiError("Access denied", status));

    await act(async () => {
      await client.invalidateQueries({ queryKey: queryKeys.operationAlerts("company-1", "user:board-user") });
    });
    await vi.waitFor(() => expect(host.querySelector('[data-testid="nav"]')).toBeNull());
    expect(host.textContent).not.toContain("Secret write");
  });

  it.each(["response", "denial"] as const)("discards a late alert %s after the session changes and returns to the same account", async (outcome) => {
    mock.get.mockResolvedValue(alerts);
    await render("admin");
    await vi.waitFor(() => expect(host.textContent).toContain("Secret write"));
    let resolveRead!: (value: CompanyOperationAlert[]) => void;
    let rejectRead!: (error: Error) => void;
    mock.get.mockReturnValueOnce(new Promise((resolve, reject) => {
      resolveRead = resolve;
      rejectRead = reject;
    }));
    const key = queryKeys.operationAlerts("company-1", "user:board-user");
    let refresh!: Promise<void>;
    await act(async () => {
      refresh = client.invalidateQueries({ queryKey: key });
      await new Promise((resolve) => setTimeout(resolve, 0));
      client.setQueryData(queryKeys.auth.session, null);
      client.setQueryData(queryKeys.auth.session, { user: { id: "board-user" } });
    });
    await act(async () => {
      if (outcome === "denial") rejectRead(new ApiError("Other account denied", 403));
      else resolveRead([{ ...alerts[0], id: "other-account-alert" }]);
      await refresh;
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(client.getQueryData(key)).toEqual(alerts);
    expect(client.getQueryState(key)?.error).toBeNull();
    expect(host.querySelector('[data-testid="nav"]')?.textContent).toBe("Operation alerts 2");
  });

  it.each([401, 403])("hides navigation and cached alerts after access is denied with %s", async (status) => {
    mock.get.mockResolvedValue(alerts);
    await render("admin");
    await vi.waitFor(() => expect(host.textContent).toContain("Secret write"));
    mock.getBoardAccess.mockRejectedValue(new ApiError("Access denied", status));

    await act(async () => {
      await client.invalidateQueries({ queryKey: queryKeys.access.currentBoardAccess });
    });
    await vi.waitFor(() => expect(host.querySelector('[data-testid="nav"]')).toBeNull());
    expect(host.textContent).not.toContain("Secret write");
    expect(mock.get).toHaveBeenCalledTimes(1);
  });

  it("drops the previous admin's cached alerts when the session changes", async () => {
    mock.get.mockResolvedValue(alerts);
    await render("admin");
    await vi.waitFor(() => expect(host.textContent).toContain("Secret write"));
    mock.getBoardAccess.mockResolvedValue({
      userId: "new-board-user",
      source: "session",
      isInstanceAdmin: true,
      companyIds: [],
      memberships: [],
    });

    await act(async () => {
      client.setQueryData(queryKeys.auth.session, { user: { id: "new-board-user" } });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(host.querySelector('[data-testid="nav"]')).toBeNull();
    expect(host.textContent).not.toContain("Secret write");
    await vi.waitFor(() => expect(host.textContent).toContain("Operation alerts require administrator access."));
    expect(mock.get).toHaveBeenCalledTimes(1);
  });

  it("allows the implicit board in a local trusted deployment", async () => {
    mock.get.mockResolvedValue(alerts);
    await render("member", "active", "local_trusted");

    await vi.waitFor(() => expect(host.textContent).toContain("Secret write"));
  });

  it.each([["member", "active"], ["admin", "suspended"]] as const)(
    "hides navigation and skips reads for %s with status %s",
    async (role, status) => {
      await render(role, status);

      expect(host.querySelector('[data-testid="nav"]')).toBeNull();
      await vi.waitFor(() => expect(host.textContent).toContain("Operation alerts require administrator access."));
      expect(mock.get).not.toHaveBeenCalled();
    },
  );
});
