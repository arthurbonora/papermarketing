import { BellRing } from "lucide-react";
import { useOperationAlerts } from "@/hooks/useOperationAlerts";
import { SidebarNavItem } from "./SidebarNavItem";

interface OperationAlertsNavItemProps {
  companyId: string | null;
  NavItem?: typeof SidebarNavItem;
  className?: string;
}

export function OperationAlertsNavItem({ companyId, NavItem = SidebarNavItem, className }: OperationAlertsNavItemProps) {
  const { recentCount, activeCount, canView } = useOperationAlerts(companyId);
  if (!canView) return null;

  return (
    <NavItem
      to="/operation-alerts"
      label="Operation alerts"
      icon={BellRing}
      badge={recentCount}
      badgeLabel="recent alerts"
      badgeTone={activeCount > 0 ? "warning" : "default"}
      className={className}
    />
  );
}
