export const MARKETING_CONNECTOR_CATEGORIES = {
  "AI models": ["openai", "anthropic", "openrouter", "google", "deepseek", "zai", "z-ai"],
  "Research & SEO": ["exa", "tavily", "firecrawl", "parallel-search", "gsc-wizard", "local-falcon", "similarweb"],
  "Creative & files": ["canva", "figma", "runway", "cloudinary", "google-drive", "google-docs", "google-slides", "notion"],
  "Communication": ["gmail", "slack", "microsoft-teams", "google-chat", "google-calendar", "agentmail", "discord", "telegram", "imessage-photon"],
  "Publishing & media": ["linkedin", "instagram", "facebook", "meta-ads", "facebook-ads", "google-ads", "tiktok", "youtube", "beehiiv", "klaviyo", "webflow", "shopify"],
  "Data & measurement": ["google-sheets", "google-analytics", "ga4", "mixpanel", "posthog", "windsor-ai"],
  "Automation": ["composio", "zapier", "make"],
} as const;

export type MarketingConnectorCategory = keyof typeof MARKETING_CONNECTOR_CATEGORIES;

export const MARKETING_CATEGORY_BY_SLUG = new Map<string, MarketingConnectorCategory>(
  (Object.keys(MARKETING_CONNECTOR_CATEGORIES) as MarketingConnectorCategory[]).flatMap(category =>
    MARKETING_CONNECTOR_CATEGORIES[category].map(slug => [slug, category] as const),
  ),
);
