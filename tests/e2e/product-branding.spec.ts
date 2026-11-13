import { test, expect } from "@playwright/test";
import { createMarketingWorkspace } from "./helpers/marketing-workspace";

test("uses the product brand across workspace pages and keeps upstream attribution in the footer", async ({ page }) => {
  const workspace = await createMarketingWorkspace(page, `Brand acceptance ${Date.now()}`);
  try {
    for (const route of ["dashboard", "agents/all", "apps", "company/settings"]) {
      await page.goto(`/${workspace.issuePrefix}/${route}`);
      await expect(page.getByRole("navigation", { name: route === "company/settings" ? "Settings" : "Workspace navigation", exact: true })).toBeVisible();
      const attribution = page.getByRole("contentinfo").getByRole("link", { name: "Built on Paperclip", exact: true });
      await expect(attribution).toBeVisible();
      await expect(attribution).toHaveAttribute("href", "https://github.com/paperclipai/paperclip");
      await expect.poll(async () => (await page.locator("body").innerText()).match(/\bPaperclip\b/g)?.length ?? 0).toBe(1);
      await expect(page).toHaveTitle(/PaperMarketing/);
    }
    await page.goto(`/${workspace.issuePrefix}/agents/new`);
    await expect(page.getByRole("heading", { name: "Create your marketing agent", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog")).not.toContainText(/\bPaperclip\b/);
    await page.getByLabel("Agent name", { exact: true }).fill("Brand review agent");
    await page.getByLabel("Agent type", { exact: true }).click();
    await page.getByRole("option", { name: "Designer", exact: true }).click();
    await page.getByRole("button", { name: "Choose adapter", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Choose an adapter", exact: true })).toBeVisible();
    const dialog = page.getByRole("dialog");
    await expect(dialog).not.toContainText(/\bPaperclip\b/);
  } finally {
    await page.request.patch(`/api/companies/${workspace.id}`, { data: { status: "archived" } });
  }
});
