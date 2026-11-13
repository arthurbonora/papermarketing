import { CircleCheck, ClipboardCheck, FolderOpen, LayoutDashboard, Package, Unplug, Users } from "lucide-react";

export const MARKETING_DESTINATIONS = {
  overview: { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  projects: { to: "/projects", label: "Projects", icon: FolderOpen },
  tasks: { to: "/issues", label: "Tasks", icon: CircleCheck },
  deliverables: { to: "/artifacts", label: "Deliverables", icon: Package },
  approvals: { to: "/approvals/pending", label: "Approvals", icon: ClipboardCheck },
  team: { to: "/agents/all", label: "Team", icon: Users },
  connectors: { to: "/apps", label: "Connections", icon: Unplug },
} as const;
