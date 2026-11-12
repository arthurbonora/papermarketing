import { CircleCheck, ClipboardCheck, FolderOpen, LayoutDashboard, Package, Unplug, Users } from "lucide-react";

export const MARKETING_DESTINATIONS = {
  overview: { to: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  projects: { to: "/projects", label: "Projetos", icon: FolderOpen },
  tasks: { to: "/issues", label: "Tarefas", icon: CircleCheck },
  deliverables: { to: "/artifacts", label: "Entregas", icon: Package },
  approvals: { to: "/approvals/pending", label: "Aprovações", icon: ClipboardCheck },
  team: { to: "/agents/all", label: "Equipe", icon: Users },
  connectors: { to: "/apps", label: "Conexões", icon: Unplug },
} as const;
