import { BellRing } from "lucide-react";
import { useOperationAlerts } from "@/hooks/useOperationAlerts";
import { SidebarNavItem } from "./SidebarNavItem";

interface OperationAlertsNavItemProps {
  companyId: string | null;
  NavItem?: typeof SidebarNavItem;
  className?: string;
}

export function OperationAlertsNavItem({ companyId, NavItem = SidebarNavItem, className }: OperationAlertsNavItemProps) {
  const { recentCount, activeCount, canView, canShowNav } = useOperationAlerts(companyId);
  if (!canShowNav) return null;

  return (
    <NavItem
      to="/operation-alerts"
      label="Operation alerts"
      icon={BellRing}
      badge={canView ? recentCount : undefined}
      badgeLabel="recent alerts"
      badgeTone={activeCount > 0 ? "warning" : "default"}
      className={className}
    />
  );
}
