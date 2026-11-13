import { expect, type Page } from "@playwright/test";

export async function createMarketingWorkspace(page: Page, name: string) {
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Create workspace", exact: true })).toBeVisible();
  await page.getByLabel("Workspace name", { exact: true }).fill(name);
  const saved = page.waitForResponse(response => response.request().method() === "POST"
    && new URL(response.url()).pathname === "/api/companies");
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  const response = await saved;
  expect(response.ok()).toBe(true);
  const workspace = await response.json();
  await expect(page.getByRole("heading", { name: "Create your marketing agent" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/${workspace.issuePrefix}/agents/new`));
  return workspace as { id: string; issuePrefix: string; name: string };
}

export async function chooseMarketingType(page: Page, label = "CMO") {
  await page.getByLabel("Agent type", { exact: true }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
}
