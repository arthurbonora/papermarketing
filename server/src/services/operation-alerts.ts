import { randomUUID } from "node:crypto";
import type { CompanyOperationAlert, CompanyOperationAlertKind } from "@paperclipai/shared";

const alertDelay: Record<CompanyOperationAlertKind, number> = {
  secret_write: 15_000,
  routine_dispatch: 60_000,
};
const historyMs = 24 * 60 * 60_000;
const maxCompletedAlerts = 250;

interface TrackedOperation {
  id: string;
  companyId: string;
  kind: CompanyOperationAlertKind;
  startedAt: number;
  detectedAt: number;
}

const running = new Map<string, TrackedOperation>();
const completed: Array<TrackedOperation & { resolvedAt: number }> = [];

export async function trackCompanyOperation<T>(
  companyId: string,
  kind: CompanyOperationAlertKind,
  operation: () => Promise<T>,
): Promise<T> {
  const id = randomUUID();
  const startedAt = Date.now();
  const tracked = { id, companyId, kind, startedAt, detectedAt: startedAt + alertDelay[kind] };
  running.set(id, tracked);
  try {
    return await operation();
  } finally {
    running.delete(id);
    const resolvedAt = Date.now();
    if (resolvedAt >= tracked.detectedAt) {
      completed.push({ ...tracked, resolvedAt });
      if (completed.length > maxCompletedAlerts) completed.shift();
    }
  }
}

function toAlert(operation: TrackedOperation, resolvedAt: number | null): CompanyOperationAlert {
  return {
    id: operation.id,
    kind: operation.kind,
    startedAt: new Date(operation.startedAt).toISOString(),
    detectedAt: new Date(operation.detectedAt).toISOString(),
    resolvedAt: resolvedAt === null ? null : new Date(resolvedAt).toISOString(),
  };
}

export function listCompanyOperationAlerts(companyId: string): CompanyOperationAlert[] {
  const now = Date.now();
  // Detection must work while a monitored operation is waiting on the database.
  // A board read evaluates elapsed time without a new write or a timer per operation.
  const active = Array.from(running.values())
    .filter((operation) => operation.companyId === companyId && operation.detectedAt <= now)
    .sort((left, right) => right.detectedAt - left.detectedAt)
    .map((operation) => toAlert(operation, null));
  const recent = completed
    .filter((operation) => operation.companyId === companyId && operation.resolvedAt > now - historyMs)
    .reverse()
    .map((operation) => toAlert(operation, operation.resolvedAt));
  return [...active, ...recent];
}
