import { BellRing } from "lucide-react";
import { useOperationAlerts } from "@/hooks/useOperationAlerts";
import { SidebarNavItem } from "./SidebarNavItem";

interface OperationAlertsNavItemProps {
  companyId: string | null;
  NavItem?: typeof SidebarNavItem;
  className?: string;
}

export function OperationAlertsNavItem({ companyId, NavItem = SidebarNavItem, className }: OperationAlertsNavItemProps) {
  const { activeCount, canView } = useOperationAlerts(companyId, true);
  if (!canView) return null;

  return (
    <NavItem
      to="/operation-alerts"
      label="Operation alerts"
      icon={BellRing}
      badge={activeCount}
      badgeLabel="active alerts"
      badgeTone="warning"
      className={className}
    />
  );
}
