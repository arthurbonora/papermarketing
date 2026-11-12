import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  FileCode2,
  Fingerprint,
  Gauge,
  History,
  KeyRound,
  Library,
  MessageSquare,
  PlayCircle,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useAgentEnvironmentSlots } from "@/plugins/useAgentEnvironmentSlots";
import { usePluginSlots } from "@/plugins/slots";
import { agentsApi } from "@/api/agents";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import { useLocation } from "@/lib/router";
import { ContextualSidebarFrame } from "./ContextualSidebarFrame";
import { SidebarNavItem } from "./SidebarNavItem";
import { contextualSidebarStyles } from "./contextual-sidebar-styles";
import {
  AGENT_DETAIL_NAVIGATION,
  agentDetailHref,
  parseAgentDetailView,
  type AgentLocalDetailView,
} from "@/pages/agent-detail-navigation";

const localIcons = {
  overview: Sparkles,
  instructions: Fingerprint,
  skills: Library,
  runtime: Settings2,
  secrets: KeyRound,
  tools: Wrench,
  channels: MessageSquare,
  permissions: ShieldCheck,
  "api-keys": KeyRound,
  revisions: History,
  advanced: FileCode2,
  activity: Activity,
  runs: PlayCircle,
  costs: ReceiptText,
  budgets: Gauge,
} satisfies Record<AgentLocalDetailView, typeof Sparkles>;

const technicalViews = new Set<AgentLocalDetailView>(["secrets", "advanced"]);
const technicalItems = AGENT_DETAIL_NAVIGATION.flatMap(section =>
  section.items.filter(item => technicalViews.has(item.value)));

export function AgentContextualSidebar({
  agentRef,
  agentId,
  agentName,
  labels,
  marketingNavigation = false,
}: {
  agentRef: string;
  agentId?: string;
  agentName?: string;
  labels?: Partial<Record<AgentLocalDetailView, string>>;
  marketingNavigation?: boolean;
}) {
  const { pathname } = useLocation();
  const { selectedCompanyId } = useCompany();
  const shouldResolveAgent = !agentId || !agentName;
  const { data: resolvedAgent } = useQuery({
    queryKey: [...queryKeys.agents.detail(agentRef), selectedCompanyId ?? null, "contextual-sidebar"],
    queryFn: () => agentsApi.get(agentRef, selectedCompanyId ?? undefined),
    enabled: shouldResolveAgent && Boolean(agentRef && selectedCompanyId),
  });
  const resolvedId = agentId ?? resolvedAgent?.id;
  const { slots: declaredTabs } = usePluginSlots({ slotTypes: ["detailTab"], entityType: "agent", companyId: resolvedAgent?.companyId ?? selectedCompanyId, enabled: Boolean(resolvedId) });
  const { slots: pluginTabs } = useAgentEnvironmentSlots(declaredTabs, resolvedId, resolvedAgent?.companyId ?? selectedCompanyId);
  const resolvedName = agentName ?? resolvedAgent?.name ?? "Agent";
  const currentView = parseAgentDetailView(pathname.match(/\/agents\/[^/]+\/([^/]+)\/?$/i)?.[1] ?? null);

  function renderItem({ value, label }: { value: AgentLocalDetailView; label: string }) {
    return <SidebarNavItem
      key={value}
      to={agentDetailHref(agentRef, value)}
      label={labels?.[value] ?? label}
      icon={localIcons[value]}
    />;
  }

  return (
    <ContextualSidebarFrame
      surface="agent"
      title={resolvedName}
      fallbackTo="/agents/all"
      showHeader={false}
      className="border-r border-border bg-background"
    >
      <nav
        aria-label={`${resolvedName} navigation`}
        data-slot="contextual-sidebar-nav"
        className={contextualSidebarStyles.nav}
      >
        {AGENT_DETAIL_NAVIGATION.map((section) => (
          <div key={section.label} className="contents">
            {section.label === "Audit" && pluginTabs.length > 0 ? (
              <div data-slot="contextual-sidebar-section" className={contextualSidebarStyles.section}>
                <p className={contextualSidebarStyles.sectionLabel}>Apps</p>
                <div className={contextualSidebarStyles.group}>
                  {pluginTabs.map(slot => <SidebarNavItem key={`${slot.pluginKey}:${slot.id}`} to={`/agents/${encodeURIComponent(agentRef)}/${encodeURIComponent(`plugin:${slot.pluginKey}:${slot.id}`)}`} label={slot.displayName} icon={Wrench} />)}
                </div>
              </div>
            ) : null}
            <div data-slot="contextual-sidebar-section" className={contextualSidebarStyles.section}>
              <p data-slot="contextual-sidebar-section-label" className={contextualSidebarStyles.sectionLabel}>
                {section.label}
              </p>
              <div data-slot="contextual-sidebar-group" className={contextualSidebarStyles.group}>
                {section.items.filter(item => !marketingNavigation || !technicalViews.has(item.value)).map(renderItem)}
              </div>
            </div>
            {marketingNavigation && section.label === "Agent" ? (
              <details key={pathname} open={technicalViews.has(currentView) || undefined} className="mt-2">
                <summary className="cursor-pointer rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Configuração técnica
                </summary>
                <div className={contextualSidebarStyles.group}>{technicalItems.map(renderItem)}</div>
              </details>
            ) : null}
          </div>
        ))}
      </nav>
    </ContextualSidebarFrame>
  );
}
