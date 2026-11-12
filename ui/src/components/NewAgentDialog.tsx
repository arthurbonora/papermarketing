import { useCompany } from "../context/CompanyContext";
import { useNavigate } from "@/lib/router";
import { useDialog } from "../context/DialogContext";
import { AgentBasicsDialog } from "./new-agent/AgentBasicsDialog";

export function NewAgentDialog() {
  const { newAgentOpen, closeNewAgent } = useDialog();
  const { selectedCompanyId } = useCompany();
  if (!newAgentOpen) return null;
  return <NewAgentDialogContent key={selectedCompanyId} onClose={closeNewAgent} />;
}

function NewAgentDialogContent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <AgentBasicsDialog
      open
      onClose={onClose}
      onContinue={(basics) => {
        onClose();
        navigate(`/agents/new?${new URLSearchParams(basics)}`);
      }}
    />
  );
}
