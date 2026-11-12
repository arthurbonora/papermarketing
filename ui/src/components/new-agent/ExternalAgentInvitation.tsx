import { useCompany } from "@/context/CompanyContext";
import { useActiveCompanyPrefix, useNavigate, useSearchParams } from "@/lib/router";
import { ExternalAgentInviteDialog } from "./ExternalAgentInviteDialog";

export function ExternalAgentInvitation() {
  const { selectedCompany } = useCompany();
  const companyPrefix = useActiveCompanyPrefix();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const close = () => navigate("/company/settings");
  if (!selectedCompany || selectedCompany.issuePrefix.toUpperCase() !== companyPrefix?.toUpperCase()) return null;

  return <ExternalAgentInviteDialog
    key={selectedCompany.id}
    companyId={selectedCompany.id}
    initialPreset={params.get("provider") === "muse" ? "muse" : null}
    initialMuseName={params.get("name") ?? ""}
    onClose={close}
    onBack={close}
  />;
}
