import { useQuery } from "@tanstack/react-query";
import type { CompanyOperationAlert } from "@paperclipai/shared";
import { accessApi } from "@/api/access";
import { api, ApiError } from "@/api/client";
import { queryKeys } from "@/lib/queryKeys";

const OPERATION_ALERTS_INTERVAL_MS = 20_000;

function accessDenied(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function useOperationAlerts(companyId: string | null, poll = false) {
  const access = useQuery({
    queryKey: queryKeys.access.currentBoardAccess,
    queryFn: accessApi.getCurrentBoardAccess,
    enabled: Boolean(companyId),
  });
  const board = access.data;
  const membership = board?.memberships?.find((item) => item.companyId === companyId);
  const canView = Boolean(companyId && board && !accessDenied(access.error) && (
    board.source === "local_implicit" ||
    board.isInstanceAdmin ||
    (membership?.status === "active" &&
      (membership.membershipRole === "owner" || membership.membershipRole === "admin"))
  ));

  const alerts = useQuery({
    queryKey: queryKeys.operationAlerts(companyId, board?.userId ?? null),
    queryFn: ({ signal }) => api.get<CompanyOperationAlert[]>(
      `/companies/${encodeURIComponent(companyId!)}/operation-alerts`,
      { signal },
    ),
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
