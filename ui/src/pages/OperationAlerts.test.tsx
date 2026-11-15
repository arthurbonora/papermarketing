// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyOperationAlert } from "@paperclipai/shared";
import { OperationAlertsNavItem } from "@/components/OperationAlertsNavItem";
import { queryKeys } from "@/lib/queryKeys";
import { OperationAlerts } from "./OperationAlerts";

const mock = vi.hoisted(() => ({ get: vi.fn(), setBreadcrumbs: vi.fn() }));

vi.mock("@/api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/api/client")>(),
  api: { get: mock.get },
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

  async function render(role: "admin" | "member", status = "active") {
    client.setQueryData(queryKeys.access.currentBoardAccess, {
      userId: "board-user",
      source: "session",
      isInstanceAdmin: false,
      memberships: [{ companyId: "company-1", membershipRole: role, status }],
    });
    await act(() => root.render(
      <QueryClientProvider client={client}>
        <OperationAlertsNavItem companyId="company-1" NavItem={({ label, badge }) => <span data-testid="nav">{label} {badge}</span>} />
        <OperationAlerts />
      </QueryClientProvider>,
    ));
  }

  it("uses a single company-scoped read, counts only active alerts, and shows timestamps", async () => {
    mock.get.mockResolvedValue(alerts);
    await render("admin");

    await vi.waitFor(() => expect(host.querySelector('[data-testid="nav"]')?.textContent).toBe("Operation alerts 1"));
    expect(mock.get).toHaveBeenCalledExactlyOnceWith("/companies/company-1/operation-alerts", { signal: expect.any(AbortSignal) });
    const rows = host.querySelectorAll("li");
    expect(rows[0]?.textContent).toContain("Secret write");
    expect(rows[0]?.textContent).toContain("Still running");
    expect(rows[0]?.querySelectorAll("time")).toHaveLength(2);
    expect(rows[1]?.textContent).toContain("Routine dispatch");
    expect(rows[1]?.textContent).toContain("Ended");
    expect(rows[1]?.querySelector(`time[datetime="${resolvedAt}"]`)).not.toBeNull();
  });

  it.each([["member", "active"], ["admin", "suspended"]] as const)(
    "hides navigation and skips reads for %s with status %s",
    async (role, status) => {
      await render(role, status);

      expect(host.querySelector('[data-testid="nav"]')).toBeNull();
      expect(host.textContent).toContain("Operation alerts require administrator access.");
      expect(mock.get).not.toHaveBeenCalled();
    },
  );
});
