import { DEFAULT_ANNOUNCEMENT_FEED_URL } from "@paperclipai/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../config.js";

const customFeed = "https://example.test/announcements/current.json";

describe("Papermarketing announcement configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    { flag: undefined, feed: undefined, enabled: false, url: DEFAULT_ANNOUNCEMENT_FEED_URL },
    { flag: undefined, feed: " ", enabled: false, url: DEFAULT_ANNOUNCEMENT_FEED_URL },
    { flag: undefined, feed: customFeed, enabled: true, url: customFeed },
    { flag: "true", feed: undefined, enabled: true, url: DEFAULT_ANNOUNCEMENT_FEED_URL },
    { flag: "false", feed: customFeed, enabled: false, url: customFeed },
  ])("resolves enabled=$enabled for flag=$flag and feed=$feed", ({ flag, feed, enabled, url }) => {
    vi.stubEnv("PAPERCLIP_ANNOUNCEMENTS_ENABLED", flag);
    vi.stubEnv("PAPERCLIP_ANNOUNCEMENTS_FEED_URL", feed);
    const config = loadConfig(null);
    expect(config.announcementsEnabled).toBe(enabled);
    expect(config.announcementsFeedUrl).toBe(url);
  });
});
