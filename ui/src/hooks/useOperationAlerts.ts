import { CancelledError, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompanyOperationAlert } from "@paperclipai/shared";
import { accessApi } from "@/api/access";
import { api, ApiError, detachInflightGet } from "@/api/client";
import { useAccountSessionQuery } from "@/api/companies-query";
import { healthApi } from "@/api/health";
import { hasUnverifiedSession } from "@/lib/cached-session";
import { bindAccount } from "@/lib/account-scope";
import { queryKeys } from "@/lib/queryKeys";

const OPERATION_ALERTS_INTERVAL_MS = 20_000;

function accessDenied(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function useOperationAlerts(companyId: string | null, poll = false) {
  const queryClient = useQueryClient();
  const health = useQuery({ queryKey: queryKeys.health, queryFn: healthApi.get });
  const session = useAccountSessionQuery();
  const localTrusted = health.data?.deploymentMode === "local_trusted";
  const userId = session.isSuccess
    && session.fetchStatus !== "paused"
    && !hasUnverifiedSession(queryClient)
    ? session.data?.user.id ?? null
    : null;
  const sessionVerified = !queryClient.getQueryState(queryKeys.auth.session)?.isInvalidated;
  const accountKey = localTrusted ? "local_implicit" : userId && `user:${userId}`;

  async function readForVerifiedAccount<T>(read: () => Promise<T>): Promise<T> {
    const account = bindAccount(queryClient);
    const assertAccount = () => {
      if (localTrusted) return;
      const current = queryClient.getQueryState<{ user: { id: string } }>(queryKeys.auth.session);
      if (!userId || current?.status !== "success" || current.isInvalidated
        || current.fetchStatus === "paused" || hasUnverifiedSession(queryClient)
        || current.data?.user.id !== userId || !account.isCurrentAccount()) {
        throw new CancelledError({ revert: true });
      }
    };
    // Reconcile can start reads before React disables their observers. Check
    // again on completion so a response cannot cross a session transition.
    assertAccount();
    try {
      return await read();
    } finally {
      assertAccount();
    }
  }

  const access = useQuery({
    queryKey: [...queryKeys.access.currentBoardAccess, "operation-alerts", accountKey],
    queryFn: () => readForVerifiedAccount(async () => {
      detachInflightGet("/cli-auth/me");
      const board = await accessApi.getCurrentBoardAccess();
      if (localTrusted ? board.source !== "local_implicit" : board.userId !== userId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
        throw new ApiError("The signed-in account changed. Checking your session again.", 401, { code: "session_changed" });
      }
      return board;
    }),
    enabled: Boolean(companyId && accountKey && (localTrusted || sessionVerified)),
  });
  const board = access.data;
  const membership = board?.memberships?.find((item) => item.companyId === companyId);
  const permittedAccount = Boolean(companyId && board && !accessDenied(access.error) && (
    (localTrusted && board.source === "local_implicit") ||
    (userId === board.userId && board.companyIds.includes(companyId) && (
      board.isInstanceAdmin ||
      (membership?.status === "active" &&
        (membership.membershipRole === "owner" || membership.membershipRole === "admin"))
    ))
  ));
  const accountVerified = permittedAccount && (localTrusted || sessionVerified);

  const alerts = useQuery({
    queryKey: queryKeys.operationAlerts(companyId, accountKey),
    queryFn: ({ signal }) => readForVerifiedAccount(() => {
      const path = `/companies/${encodeURIComponent(companyId!)}/operation-alerts`;
      detachInflightGet(path);
      return api.get<CompanyOperationAlert[]>(path, { signal });
    }),
    enabled: accountVerified,
    staleTime: OPERATION_ALERTS_INTERVAL_MS,
    refetchInterval: (query) => {
      if (!poll || !accountVerified || accessDenied(query.state.error)) return false;
      return OPERATION_ALERTS_INTERVAL_MS;
    },
  });

  const canView = accountVerified && !accessDenied(alerts.error);
  const visibleAlerts = canView ? alerts.data : undefined;
  const recentCount = visibleAlerts?.length ?? 0;
  const activeCount = visibleAlerts?.filter((alert) => alert.resolvedAt === null).length ?? 0;

  // An ordinary session refresh can retain the generic destination. Alert data
  // and its badge still wait for the account to be verified.
  const canShowNav = permittedAccount && !accessDenied(alerts.error);
  return { access, alerts, canView, canShowNav, recentCount, activeCount };
}
