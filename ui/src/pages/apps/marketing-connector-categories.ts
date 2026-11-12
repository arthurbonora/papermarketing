export const MARKETING_CONNECTOR_CATEGORIES = {
  "Modelos de IA": ["openai", "anthropic", "openrouter", "google", "deepseek", "zai", "z-ai"],
  "Pesquisa e SEO": ["exa", "tavily", "firecrawl", "parallel-search", "gsc-wizard", "local-falcon", "similarweb"],
  "Criação e arquivos": ["canva", "figma", "runway", "cloudinary", "google-drive", "google-docs", "google-slides", "notion"],
  "Comunicação": ["gmail", "slack", "microsoft-teams", "google-chat", "google-calendar", "agentmail"],
  "Publicação e mídia": ["linkedin", "instagram", "facebook", "meta-ads", "facebook-ads", "google-ads", "tiktok", "youtube", "beehiiv", "klaviyo", "webflow", "shopify"],
  "Dados e mensuração": ["google-sheets", "google-analytics", "ga4", "mixpanel", "posthog", "windsor-ai"],
  "Automação": ["composio", "zapier", "make"],
} as const;

export type MarketingConnectorCategory = keyof typeof MARKETING_CONNECTOR_CATEGORIES;

export const MARKETING_CATEGORY_BY_SLUG = new Map<string, MarketingConnectorCategory>(
  (Object.keys(MARKETING_CONNECTOR_CATEGORIES) as MarketingConnectorCategory[]).flatMap(category =>
    MARKETING_CONNECTOR_CATEGORIES[category].map(slug => [slug, category] as const),
  ),
);
