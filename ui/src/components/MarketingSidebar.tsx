import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, History, Inbox, MessageCircle, Repeat, Search, Settings, SquarePen, Users,
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
import { MARKETING_DESTINATIONS } from "@/lib/marketing-navigation";

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
            aria-label="New task"
            title="New task"
            onClick={() => openNewIssue()}
            className="mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-(length:--text-compact) font-medium text-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <SquarePen className="size-4 shrink-0" />
            <span className={rail ? SIDEBAR_RAIL_HIDDEN_LABEL : "truncate"}>New task</span>
          </button>
          <SidebarNavItem {...MARKETING_DESTINATIONS.overview} liveCount={liveRuns?.length ?? 0} />
          <SidebarNavItem {...MARKETING_DESTINATIONS.projects} />
          <SidebarStarredProjects />
          <SidebarNavItem {...MARKETING_DESTINATIONS.tasks} />
          <SidebarNavItem {...MARKETING_DESTINATIONS.deliverables} />
          <SidebarNavItem {...MARKETING_DESTINATIONS.approvals} />
          <SidebarNavItem {...MARKETING_DESTINATIONS.team} />
          <SidebarNavItem {...MARKETING_DESTINATIONS.connectors} />
        </div>
        <SidebarSection label="Updates">
          <SidebarNavItem to="/search" label="Search" icon={Search} />
          <SidebarNavItem
            to="/inbox"
            label="Inbox"
            icon={Inbox}
            badge={inbox.inbox}
            badgeLabel="unread"
            badgeTone={inbox.failedRuns > 0 ? "danger" : "default"}
          />
          {agentChatEnabled && <SidebarNavItem to="/chats" label="Chats" icon={MessageCircle} badge={chats.data?.filter(chat => chat.isUnreadForMe).length} badgeLabel="unread chats" />}
          <SidebarNavItem to="/routines" label="Routines" icon={Repeat} />
        </SidebarSection>
        <SidebarSection label="Administration">
          <SidebarNavItem to="/costs" label="Costs" icon={DollarSign} />
          <SidebarNavItem to="/activity" label="Activity log" icon={History} />
          <SidebarNavItem to="/company/settings" label="Settings" icon={Settings} />
          <SidebarNavItem to="/company/settings/agent-invitations" label="External agents" icon={Users} />
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
