import { useId, useState } from "react";
import {
  MARKETING_AGENT_TEMPLATES, MARKETING_WORKING_LANGUAGES, createMarketingAgentProfile,
  type MarketingAgentProfile, type MarketingAgentTypeId,
} from "@paperclipai/shared";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { NativeSelect, SelectPopover, SelectPopoverItem } from "../ui/select";

const fields = [
  ["responsibilities", "Responsibilities"],
  ["instructions", "Instructions"],
  ["expectedInputs", "Expected inputs"],
  ["deliverables", "Deliverables"],
  ["qualityCriteria", "Quality criteria"],
] as const;

export function MarketingAgentFields({ value, onChange, disabled = false }: {
  value: MarketingAgentProfile | null;
  onChange: (profile: MarketingAgentProfile) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [pendingType, setPendingType] = useState<MarketingAgentTypeId | null>(null);
  const [editingCustomLanguage, setEditingCustomLanguage] = useState(false);
  const selected = MARKETING_AGENT_TEMPLATES.find(item => item.id === value?.typeId);
  const workingLanguage = value?.workingLanguage;
  const customLanguage = editingCustomLanguage || (workingLanguage !== undefined
    && !MARKETING_WORKING_LANGUAGES.some(item => item.value === workingLanguage));
  const languageChoice = customLanguage ? "custom" : workingLanguage ?? "";
  const normalized = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const choices = MARKETING_AGENT_TEMPLATES.filter(item => normalized(item.label).includes(normalized(search)));
  function select(typeId: MarketingAgentTypeId) {
    setOpen(false);
    setSearch("");
    if (typeId === value?.typeId) return;
    if (value) setPendingType(typeId);
    else onChange(createMarketingAgentProfile(typeId));
  }
  return <div className="space-y-4">
    <div className="space-y-2">
      <label className="text-sm font-medium">Agent type *</label>
      <SelectPopover aria-label="Agent type" value={value?.typeId ?? ""}
        displayValue={selected?.label} placeholder="Choose one of 12 types"
        disabled={disabled} open={open} onOpenChange={setOpen}>
        <div className="space-y-2">
          <Input aria-label="Search agent types" placeholder="Search roles…" value={search}
            onChange={event => setSearch(event.target.value)} />
          <div role="listbox" aria-label="Agent types" className="max-h-64 overflow-y-auto">
            {choices.map(item => <SelectPopoverItem key={item.id} selected={item.id === value?.typeId}
              onClick={() => select(item.id)}>{item.label}</SelectPopoverItem>)}
            {!choices.length && <p className="p-2 text-sm text-muted-foreground">No agent types found.</p>}
          </div>
        </div>
      </SelectPopover>
    </div>
    {pendingType && <div role="status" className="space-y-2 rounded-md border p-3">
      <p className="text-sm">Change to {MARKETING_AGENT_TEMPLATES.find(item => item.id === pendingType)?.label}?
        Your current instructions are preserved unless you choose to apply the new template.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={disabled} onClick={() => {
          const next = createMarketingAgentProfile(pendingType);
          onChange({ ...next, ...value!, typeId: pendingType, templateVersion: next.templateVersion, workingLanguage: value?.workingLanguage });
          setPendingType(null);
        }}>Keep customizations</Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => {
          onChange({ ...createMarketingAgentProfile(pendingType), specialization: value?.specialization ?? "", workingLanguage: value?.workingLanguage });
          setPendingType(null);
        }}>Apply new template</Button>
        <Button type="button" variant="ghost" onClick={() => setPendingType(null)}>Cancel change</Button>
      </div>
    </div>}
    {value && <>
      <div className="space-y-2">
        <label htmlFor={`${id}-specialization`} className="text-sm font-medium">Specialization (optional)</label>
        <Input id={`${id}-specialization`} value={value.specialization} maxLength={500} disabled={disabled}
          placeholder="e.g., Meta Ads, SEO, visual identity"
          onChange={event => onChange({ ...value, specialization: event.target.value })} />
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-language`} className="text-sm font-medium">Working language</label>
        <NativeSelect id={`${id}-language`} value={languageChoice} disabled={disabled}
          aria-describedby={`${id}-language-help`}
          onChange={event => {
            const choice = event.target.value;
            setEditingCustomLanguage(choice === "custom");
            onChange({ ...value, workingLanguage: choice === "custom" ? "" : choice || undefined });
          }}>
          <option value="">Follow existing instructions</option>
          {MARKETING_WORKING_LANGUAGES.map(language => <option key={language.value} value={language.value}>{language.label}</option>)}
          <option value="custom">Another language…</option>
        </NativeSelect>
        {customLanguage && <Input aria-label="Custom working language" required maxLength={100}
          value={workingLanguage ?? ""} disabled={disabled} placeholder="e.g., Korean or es-MX"
          onChange={event => {
            setEditingCustomLanguage(true);
            onChange({ ...value, workingLanguage: event.target.value });
          }} />}
        <p id={`${id}-language-help`} className="text-sm text-muted-foreground">
          Used for new agent instructions. A task can request a different language.
          For an existing agent, update its Instructions to change how it works.
        </p>
      </div>
      <details className="space-y-3" open>
        <summary className="cursor-pointer text-sm font-medium">Review responsibilities and instructions</summary>
        {fields.map(([key, label]) => <div key={key} className="space-y-2">
          <label htmlFor={`${id}-${key}`} className="text-sm font-medium">{label}</label>
          <Textarea id={`${id}-${key}`} value={value[key]} required maxLength={12000} disabled={disabled}
            rows={3} onChange={event => onChange({ ...value, [key]: event.target.value })} />
        </div>)}
      </details>
      <p className="text-sm text-muted-foreground">The model, account, and tools are configured separately.
        The role does not grant permissions or start tasks.</p>
    </>}
  </div>;
}
