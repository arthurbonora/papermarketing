import { TabFilters } from "@/components/TabBar";

export const CATALOG_SOURCES = ["paperclip", "composio", "arcade", "installed", "all"] as const;
export type CatalogSource = typeof CATALOG_SOURCES[number] | "marketing";
export const CATALOG_SOURCE_NAMES = { marketing: "Marketing", paperclip: "PaperMarketing", composio: "Composio", arcade: "Arcade", executor: "Executor", installed: "Installed", all: "All" };

const MARKETING_SOURCES = ["marketing", "installed", "composio", "arcade", "all"] as const;

export function CatalogSourceFilters({ source, onChange, marketingCatalog = false }: {
  source: CatalogSource; onChange: (source: CatalogSource) => void; marketingCatalog?: boolean;
}) {
  const sources = marketingCatalog ? MARKETING_SOURCES : CATALOG_SOURCES;
  return <TabFilters label="App filters" size="standard" items={sources.map(value => ({ value, label: CATALOG_SOURCE_NAMES[value] }))} value={source} onValueChange={onChange} />;
}
