import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CircleCheck, ClipboardCheck, DollarSign, FolderOpen, History, Inbox, LayoutDashboard,
  MessageCircle, Package, Repeat, Search, Settings, SquarePen, Unplug, Users,
} from "lucide-react";
import { useAgentChatNavigation } from "@/hooks/useAgentChatNavigation";
import { useCompany } from "@/context/CompanyContext";
import { useDialogActions } from "@/context/DialogContext";
import { useSidebar } from "@/context/SidebarContext";
import { useInboxBadge } from "@/hooks/useInboxBadge";
import { heartbeatsApi } from "@/api/heartbeats";
import { queryKeys } from "@/lib/queryKeys";
import { PluginLauncherOutlet } from "@/plugins/launchers";
import { PluginSlotOutlet } from "@/plugins/slots";
import { SidebarCompanyMenu } from "./SidebarCompanyMenu";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarSection } from "./SidebarSection";
import { SidebarRecentTasks } from "./SidebarRecentTasks";
import { SidebarStarredProjects } from "./SidebarStarredProjects";
import { primarySidebarStyles } from "./primary-sidebar-styles";
import { cn, SIDEBAR_RAIL_HIDDEN_LABEL } from "@/lib/utils";

export const MARKETING_DESTINATIONS = {
  overview: { to: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  projects: { to: "/projects", label: "Projetos", icon: FolderOpen },
  tasks: { to: "/issues", label: "Tarefas", icon: CircleCheck },
  team: { to: "/agents/all", label: "Equipe", icon: Users },
  connectors: { to: "/apps", label: "Conexões", icon: Unplug },
} as const;

export function MarketingSidebar({ children }: { children?: ReactNode }) {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { openNewIssue } = useDialogActions();
  const { collapsed, peeking, isMobile } = useSidebar();
  const rail = collapsed && !peeking && !isMobile;
  const { enabled: agentChatEnabled, chats } = useAgentChatNavigation();
  const inbox = useInboxBadge(selectedCompanyId);
  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId ?? "__none__"),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const liveIssueIds = useMemo(() => new Set(
    (liveRuns ?? []).flatMap(run => run.issueId ? [run.issueId] : []),
  ), [liveRuns]);
  const pluginContext = {
    companyId: selectedCompanyId,
    companyPrefix: selectedCompany?.issuePrefix ?? null,
  };

  return (
    <aside className={cn("flex h-full min-h-0 w-full flex-col", primarySidebarStyles.surface)}>
      <div className="flex h-(--sz-60px) shrink-0 items-center gap-1 px-3">
        <SidebarCompanyMenu />
      </div>
      <nav aria-label="Workspace navigation" className={primarySidebarStyles.nav}>
        <div className={primarySidebarStyles.group}>
          <button
            type="button"
            aria-label="Nova tarefa"
            title="Nova tarefa"
            onClick={() => openNewIssue()}
            className="mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-(length:--text-compact) font-medium text-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <SquarePen className="size-4 shrink-0" />
            <span className={rail ? SIDEBAR_RAIL_HIDDEN_LABEL : "truncate"}>Nova tarefa</span>
          </button>
          <SidebarNavItem {...MARKETING_DESTINATIONS.overview} liveCount={liveRuns?.length ?? 0} />
          <SidebarNavItem {...MARKETING_DESTINATIONS.projects} />
          <SidebarStarredProjects />
          <SidebarNavItem {...MARKETING_DESTINATIONS.tasks} />
          <SidebarNavItem to="/artifacts" label="Entregas" icon={Package} />
          <SidebarNavItem to="/approvals/pending" label="Aprovações" icon={ClipboardCheck} />
          <SidebarNavItem {...MARKETING_DESTINATIONS.team} />
          <SidebarNavItem {...MARKETING_DESTINATIONS.connectors} />
        </div>
        <SidebarSection label="Acompanhamento">
          <SidebarNavItem to="/search" label="Buscar" icon={Search} />
          <SidebarNavItem
            to="/inbox"
            label="Caixa de entrada"
            icon={Inbox}
            badge={inbox.inbox}
            badgeLabel="não lidas"
            badgeTone={inbox.failedRuns > 0 ? "danger" : "default"}
          />
          {agentChatEnabled && <SidebarNavItem to="/chats" label="Conversas" icon={MessageCircle} badge={chats.data?.filter(chat => chat.isUnreadForMe).length} badgeLabel="conversas não lidas" />}
          <SidebarNavItem to="/routines" label="Rotinas" icon={Repeat} />
        </SidebarSection>
        <SidebarSection label="Administração">
          <SidebarNavItem to="/costs" label="Custos" icon={DollarSign} />
          <SidebarNavItem to="/activity" label="Auditoria" icon={History} />
          <SidebarNavItem to="/company/settings" label="Configurações" icon={Settings} />
          <SidebarNavItem to="/company/settings/agent-invitations" label="Agentes externos" icon={Users} />
          <PluginSlotOutlet slotTypes={["sidebar"]} context={pluginContext} missingBehavior="placeholder" />
          <PluginLauncherOutlet placementZones={["sidebar"]} context={pluginContext} />
        </SidebarSection>
        <SidebarRecentTasks companyId={selectedCompanyId} liveIssueIds={liveIssueIds} />
        {children}
        <PluginSlotOutlet slotTypes={["sidebarPanel"]} context={pluginContext} missingBehavior="placeholder" />
      </nav>
    </aside>
  );
}
