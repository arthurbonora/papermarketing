import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompanyOperationAlert } from "@paperclipai/shared";
import { accessApi } from "@/api/access";
import { api, ApiError, detachInflightGet } from "@/api/client";
import { useAccountSessionQuery } from "@/api/companies-query";
import { healthApi } from "@/api/health";
import { hasUnverifiedSession } from "@/lib/cached-session";
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
    && !queryClient.getQueryState(queryKeys.auth.session)?.isInvalidated
    ? session.data?.user.id ?? null
    : null;
  const accountKey = localTrusted ? "local_implicit" : userId && `user:${userId}`;

  const access = useQuery({
    queryKey: [...queryKeys.access.currentBoardAccess, "operation-alerts", accountKey],
    queryFn: async () => {
      detachInflightGet("/cli-auth/me");
      const board = await accessApi.getCurrentBoardAccess();
      if (localTrusted ? board.source !== "local_implicit" : board.userId !== userId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
        throw new ApiError("The signed-in account changed. Checking your session again.", 401, { code: "session_changed" });
      }
      return board;
    },
    enabled: Boolean(companyId && accountKey),
  });
  const board = access.data;
  const membership = board?.memberships?.find((item) => item.companyId === companyId);
  const canView = Boolean(companyId && board && !accessDenied(access.error) && (
    (localTrusted && board.source === "local_implicit") ||
    (userId === board.userId && board.companyIds.includes(companyId) && (
      board.isInstanceAdmin ||
      (membership?.status === "active" &&
        (membership.membershipRole === "owner" || membership.membershipRole === "admin"))
    ))
  ));

  const alerts = useQuery({
    queryKey: queryKeys.operationAlerts(companyId, accountKey),
    queryFn: ({ signal }) => {
      const path = `/companies/${encodeURIComponent(companyId!)}/operation-alerts`;
      detachInflightGet(path);
      return api.get<CompanyOperationAlert[]>(path, { signal });
    },
    enabled: canView,
    staleTime: OPERATION_ALERTS_INTERVAL_MS,
    refetchInterval: (query) => {
      if (!poll || !canView || accessDenied(query.state.error)) return false;
      return OPERATION_ALERTS_INTERVAL_MS;
    },
  });

  const visibleAlerts = canView && !accessDenied(alerts.error) ? alerts.data : undefined;
  const recentCount = visibleAlerts?.length ?? 0;
  const activeCount = visibleAlerts?.filter((alert) => alert.resolvedAt === null).length ?? 0;

  return { access, alerts, canView, recentCount, activeCount };
}
