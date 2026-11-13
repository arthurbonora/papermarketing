import { expect, test, type Page } from "@playwright/test";
import { json, setup } from "./agent-chat.shared";

async function expectPapermarketingAccountMenu(page: Page) {
  await expect(page.getByRole("link", { name: "Share feedback" })).toHaveCount(0);
  await page.getByRole("button", { name: "Open account menu" }).click();
  await expect(page.getByRole("link", { name: /Documentation/ })).toHaveAttribute(
    "href", "https://github.com/arthurbonora/papermarketing/blob/master/README.md",
  );
  await expect(page.getByRole("link", { name: "View profile" })).toBeVisible();
  await page.keyboard.press("Escape");
}

test("Classic changes the task presentation while preserving workspace navigation", async ({ page, request }) => {
  const original = await json(await request.get("/api/workspace-preferences/me"));
  const f = await setup(request);
  const settingsUrl = `/${f.company.issuePrefix}/company/settings/instance/experimental`;
  const preferencePath = `/api/companies/${f.company.id}/workspace-preferences/me`;
  try {
    expect(original.coordinatorWorkspaceEnabled).toBe(true);
    await page.goto(f.route);
    await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toBeVisible();
    await expectPapermarketingAccountMenu(page);
    await page.goto(settingsUrl);
    const classic = page.getByRole("switch", { name: "Enable classic workspace", exact: true });
    await expect(classic).toBeEnabled();
    await expect(classic).not.toBeChecked();
    await expect(page.getByRole("switch", { name: "Enable coordinator workspace", exact: true })).toHaveCount(0);

    await classic.click();
    await expect(classic).toBeChecked();
    await expect.poll(async () => (await json(await request.get("/api/workspace-preferences/me"))).coordinatorWorkspaceEnabled).toBe(false);
    await page.goto(f.route);
    await expect(page.getByRole("navigation", { name: "Workspace navigation" }).getByRole("link", { name: "Projects" })).toBeVisible();
    await expectPapermarketingAccountMenu(page);
    await page.goto(`/${f.company.issuePrefix}/apps`);
    const connectors = page.getByRole("navigation", { name: "Connectors", exact: true });
    await expect(connectors.getByRole("link", { name: "Review", exact: true })).toHaveAttribute("href", `/${f.company.issuePrefix}/apps/review`);
    await expect(connectors.getByRole("link")).toHaveCount(2);
    await page.goto(settingsUrl);
    await page.reload();
    await expect(classic).toBeChecked();

    await classic.click();
    await expect(classic).not.toBeChecked();
    await page.goto(f.route);
    await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toBeVisible();
    await page.goto(settingsUrl);
    await expect(classic).not.toBeChecked();
  } finally {
    await request.put(preferencePath, { data: { coordinatorWorkspaceEnabled: original.coordinatorWorkspaceEnabled } });
    await f.restore();
  }
});
