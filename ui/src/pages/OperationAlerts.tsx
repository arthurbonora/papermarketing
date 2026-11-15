import { useEffect } from "react";
import { BellRing, ShieldAlert } from "lucide-react";
import type { CompanyOperationAlert } from "@paperclipai/shared";
import { EmptyState } from "@/components/EmptyState";
import { QueryView } from "@/components/QueryView";
import { Badge } from "@/components/ui/badge";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { useOperationAlerts } from "@/hooks/useOperationAlerts";

const operationLabels: Record<CompanyOperationAlert["kind"], string> = {
  secret_write: "Secret write",
  routine_dispatch: "Routine dispatch",
};

const timestampFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

function AlertTimestamp({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd><time dateTime={value}>{timestampFormat.format(new Date(value))}</time></dd>
    </div>
  );
}

export function OperationAlerts() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { access, alerts, canView } = useOperationAlerts(selectedCompanyId);

  useEffect(() => {
    setBreadcrumbs([{ label: "Operation alerts" }]);
  }, [setBreadcrumbs]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold">Operation alerts</h1>
      {selectedCompanyId ? (
        <QueryView query={access} action="check your access">
          {() => canView ? (
            <QueryView query={alerts} action="load operation alerts" staleHint>
              {(items) => items.length === 0 ? (
                <EmptyState icon={BellRing} message="No recent operation alerts." />
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Operation alerts">
                  {items.map((alert) => (
                    <li key={alert.id} className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-medium">{operationLabels[alert.kind]}</h2>
                        <Badge variant={alert.resolvedAt === null ? "secondary" : "outline"}>
                          {alert.resolvedAt === null ? "Still running" : "Ended"}
                        </Badge>
                      </div>
                      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                        <AlertTimestamp label="Started" value={alert.startedAt} />
                        <AlertTimestamp label="Detected" value={alert.detectedAt} />
                        {alert.resolvedAt !== null && <AlertTimestamp label="Ended" value={alert.resolvedAt} />}
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </QueryView>
          ) : (
            <EmptyState icon={ShieldAlert} message="Operation alerts require administrator access." />
          )}
        </QueryView>
      ) : (
        <EmptyState icon={BellRing} message="Select an organization to view operation alerts." />
      )}
    </div>
  );
}
