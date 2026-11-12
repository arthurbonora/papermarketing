import { useLocation } from "@/lib/router";
import { ChatDetailSidebar } from "./chat/ChatDetailSidebar";
import { ChatSetupSidebar } from "./chat/ChatSetupNavigation";
import { Store, ShieldQuestion } from "lucide-react";
import { ADVANCED_TABS, DEVELOPER_TABS, advancedTabHref, isExperimentalToolTab } from "@/pages/tools/tool-tabs";
import { useSmokeLabEnabled } from "@/hooks/useSmokeLabEnabled";
import { useReviewCount } from "@/pages/apps/useReviewCount";
import { SidebarNavExpandedProvider, SidebarNavItem } from "./SidebarNavItem";
import { contextualSidebarStyles } from "./contextual-sidebar-styles";

/**
 * Secondary sidebar for the Apps area.
 *
 * Connectors combines discovery, account management, and connection health.
 * Review keeps governed actions waiting on the user's approval. The marketing
 * sidebar displays technical links on the routes that use them.
 */
export function MarketingAppsSidebar() {
  return <SidebarNavExpandedProvider><AppsSidebar marketingNavigation /></SidebarNavExpandedProvider>;
}

export function AppsSidebar({ marketingNavigation = false }: { marketingNavigation?: boolean } = {}) {
  const { pathname } = useLocation();
  const reviewCount = useReviewCount();
  const { enabled: smokeLabEnabled } = useSmokeLabEnabled();
  const developerTabs = DEVELOPER_TABS.filter((tab) => {
    if (isExperimentalToolTab(tab.key)) return smokeLabEnabled;
    if (marketingNavigation) return true;
    // Temporarily hide Gateways and Profiles until they are ready to ship.
    // Keep their tab definitions and routes intact so we can bring them back later.
    if (tab.key === "gateways" || tab.key === "profiles") return false;
    return true;
  });
  const inTechnicalArea = /\/apps\/(?:advanced|gateways)(?:\/|$)/i.test(pathname);
  const showTechnical = !marketingNavigation || inTechnicalArea;
  const technicalTabs = marketingNavigation ? [...ADVANCED_TABS, ...developerTabs] : developerTabs;

  if (pathname.endsWith("/apps/chat/connect")) return <ChatSetupSidebar />;
  const chatDetail = pathname.match(/\/apps\/chat\/([^/]+)(?:\/(?:settings|access|conversations|activity)|\/reviews(?:\/[^/]+)?)?\/?$/);
  if (chatDetail) return <ChatDetailSidebar endpointId={chatDetail[1]} />;

  return (
    <aside className="w-full h-full min-h-0 border-r border-border bg-background flex flex-col">
      <nav
        aria-label="Connectors"
        data-slot="contextual-sidebar-nav"
        className={contextualSidebarStyles.nav}
      >
        <div data-slot="contextual-sidebar-group" className={contextualSidebarStyles.group}>
          <SidebarNavItem to="/apps" label="Browse" icon={Store} end />
          <SidebarNavItem
            to="/apps/review"
            label="Review"
            icon={ShieldQuestion}
            badge={reviewCount > 0 ? reviewCount : undefined}
            badgeTone="warning"
            badgeLabel="waiting for your OK"
          />
        </div>
        {showTechnical && technicalTabs.length > 0 ? (
          <div data-slot="contextual-sidebar-section" className={contextualSidebarStyles.section}>
            <div
              data-slot="contextual-sidebar-section-label"
              className={contextualSidebarStyles.sectionLabel}
            >
              {marketingNavigation ? "Configuração técnica" : "Developer"}
            </div>
            {!marketingNavigation && (
              <p
                data-slot="contextual-sidebar-section-description"
                className={contextualSidebarStyles.sectionDescription}
              >
                Advanced setup for developers.
              </p>
            )}
            <div data-slot="contextual-sidebar-group" className={contextualSidebarStyles.group}>
              {technicalTabs.map((tab) => (
                <SidebarNavItem
                  key={tab.key}
                  to={advancedTabHref(tab.key)}
                  label={tab.label}
                  icon={tab.icon}
                  end
                />
              ))}
            </div>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
