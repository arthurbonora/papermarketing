export type CompanyOperationAlertKind = "secret_write" | "routine_dispatch";

export interface CompanyOperationAlert {
  id: string;
  kind: CompanyOperationAlertKind;
  startedAt: string;
  detectedAt: string;
  resolvedAt: string | null;
}
