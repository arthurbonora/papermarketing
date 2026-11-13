import { useEffect, useId, useRef, useState } from "react";
import { useCompany } from "../context/CompanyContext";
import { useDialogState } from "../context/DialogContext";
import { useLocation, useNavigate } from "../lib/router";
import { companyPrefixFromOnboardingPath } from "../lib/onboarding-route";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

/** A workspace can exist without a provider connection or an automatically hired agent. */
export function WorkspaceOnboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const id = useId();
  const { companies, loading, createCompany, setSelectedCompanyId } = useCompany();
  const { onboardingOptions, onboardingOpen } = useDialogState();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const prefix = companyPrefixFromOnboardingPath(pathname);
  const requestedWorkspace = onboardingOpen ? onboardingOptions.companyId : prefix;
  const existing = companies.find(company => onboardingOpen
    ? company.id === onboardingOptions.companyId
    : company.issuePrefix.toUpperCase() === prefix?.toUpperCase());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const missingWorkspace = Boolean(requestedWorkspace && !existing);
  useEffect(() => { if (open) { setName(""); setDescription(""); setError(null); } }, [open]);
  async function submit() {
    if (busy.current || missingWorkspace || (!existing && !name.trim())) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const workspace = existing ?? await createCompany({ name: name.trim(), description: description.trim() || null });
      setSelectedCompanyId(workspace.id);
      onClose();
      navigate(`/${workspace.issuePrefix}/agents/new`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the workspace.");
    } finally { busy.current = false; setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={next => { if (!next && !saving) onClose(); }}>
    <DialogContent>
      <DialogTitle>{existing ? `${existing.name} team` : "Create workspace"}</DialogTitle>
      <DialogDescription>Organize your brand, projects, agents, and connections in a workspace.
        You can connect accounts later.</DialogDescription>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
        {missingWorkspace && <p role={loading ? "status" : "alert"} className="text-sm text-muted-foreground">
          {loading ? "Loading workspace…" : "This workspace is unavailable for your account. Return to the workspace list."}
        </p>}
        {!existing && !missingWorkspace && <>
          <div className="space-y-2">
            <label htmlFor={`${id}-name`} className="text-sm font-medium">Workspace name</label>
            <Input id={`${id}-name`} autoFocus required maxLength={100} value={name} disabled={saving}
              onChange={event => setName(event.target.value)} placeholder="e.g., My brand" />
          </div>
          <div className="space-y-2">
            <label htmlFor={`${id}-description`} className="text-sm font-medium">Initial context (optional)</label>
            <Textarea id={`${id}-description`} maxLength={5000} value={description} disabled={saving}
              onChange={event => setDescription(event.target.value)} placeholder="Goals, audience, and brand information" />
          </div>
        </>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-4">
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving || missingWorkspace || (!existing && !name.trim())}>
            {saving ? "Saving…" : existing ? "Create agent" : "Create workspace"}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
