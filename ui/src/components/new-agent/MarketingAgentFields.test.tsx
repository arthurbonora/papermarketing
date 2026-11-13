// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createMarketingAgentProfile, type MarketingAgentProfile } from "@paperclipai/shared/marketing-agents";
import { MarketingAgentFields } from "./MarketingAgentFields";

let root: Root;
let host: HTMLDivElement;
let latest: MarketingAgentProfile | null;
function Form({ initial = null }: { initial?: MarketingAgentProfile | null }) {
  const [profile, setProfile] = useState(initial);
  latest = profile;
  return <MarketingAgentFields value={profile} onChange={setProfile} />;
}
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); latest = null; });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function choose(label: string) {
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Agent type"]')!.click());
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(item => item.textContent === label)!.click());
}
it("lists all twelve types and fills an editable profile without account or model fields", async () => {
  await act(async () => root.render(<Form />));
  expect(latest).toBeNull();
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Agent type"]')!.click());
  expect(document.querySelectorAll('[role="option"]')).toHaveLength(12);
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')].find(item => item.textContent === "Social Media")!.click());
  expect(latest!.typeId).toBe("social_media");
  expect(latest!.workingLanguage).toBe("en-US");
  expect(host.querySelectorAll("textarea")).toHaveLength(5);
  expect(latest).not.toHaveProperty("model");
  expect(latest).not.toHaveProperty("connection");
});
it("requires an explicit decision before replacing customized instructions on a type change", async () => {
  const original = { ...createMarketingAgentProfile("designer"), instructions: "Minha instrução", specialization: "Marca A", workingLanguage: "pt-BR" };
  await act(async () => root.render(<Form initial={original} />));
  await choose("Motion Designer");
  expect(latest!.typeId).toBe("designer");
  await act(async () => [...host.querySelectorAll("button")].find(item => item.textContent === "Keep customizations")!.click());
  expect(latest).toMatchObject({ typeId: "motion_designer", instructions: "Minha instrução", specialization: "Marca A", workingLanguage: "pt-BR" });
  await choose("Designer");
  await act(async () => [...host.querySelectorAll("button")].find(item => item.textContent === "Apply new template")!.click());
  expect(latest!.instructions).toBe(createMarketingAgentProfile("designer").instructions);
  expect(latest!.specialization).toBe("Marca A");
  expect(latest!.workingLanguage).toBe("pt-BR");
});
it("lets the user choose another working language while the form stays in English", async () => {
  await act(async () => root.render(<Form initial={createMarketingAgentProfile("copywriter")} />));
  const select = host.querySelector<HTMLSelectElement>("select")!;
  expect(select.value).toBe("en-US");
  await act(async () => { select.value = "pt-BR"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(latest!.workingLanguage).toBe("pt-BR");
  expect(host.textContent).toContain("Working language");
  expect(host.textContent).toContain("Review responsibilities and instructions");
  await act(async () => { select.value = "custom"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  const input = host.querySelector<HTMLInputElement>('[aria-label="Custom working language"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Korean");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(latest!.workingLanguage).toBe("Korean");
});
it.each(["es-MX", "fr-CA"])("keeps the custom editor open while typing %s", async language => {
  await act(async () => root.render(<Form initial={createMarketingAgentProfile("copywriter")} />));
  const select = host.querySelector<HTMLSelectElement>("select")!;
  await act(async () => { select.value = "custom"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  const input = host.querySelector<HTMLInputElement>('[aria-label="Custom working language"]')!;
  for (let length = 1; length <= language.length; length++) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, language.slice(0, length));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(select.value).toBe("custom");
    expect(host.contains(input)).toBe(true);
  }
  expect(latest!.workingLanguage).toBe(language);
  await act(async () => { select.value = "pt-BR"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(host.contains(input)).toBe(false);
  expect(latest!.workingLanguage).toBe("pt-BR");
});
it("does not assign English to a legacy profile when opening it or changing roles", async () => {
  const { workingLanguage: _defaultLanguage, ...legacy } = createMarketingAgentProfile("designer");
  legacy.templateVersion = 1;
  legacy.instructions = "Escreva em português.";
  await act(async () => root.render(<Form initial={legacy} />));
  expect(latest).not.toHaveProperty("workingLanguage");
  expect(host.querySelector<HTMLSelectElement>("select")!.value).toBe("");
  await choose("Motion Designer");
  await act(async () => [...host.querySelectorAll("button")].find(item => item.textContent === "Keep customizations")!.click());
  expect(latest!.workingLanguage).toBeUndefined();
  expect(latest!.instructions).toBe(legacy.instructions);
  expect(host.textContent).toContain("For an existing agent, update its Instructions");
});
