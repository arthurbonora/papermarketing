import { environmentSupportsLoginPty } from "@paperclipai/shared";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type AiProvider, type AiAuthMethod, type AiConnectionLoginIntent } from "@paperclipai/shared";
import { AgentProviderConnection } from "@/components/new-agent/AgentProviderConnection";
import { ProviderApiKeyCard } from "@/components/AdapterLoginChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiConnectionsApi } from "@/api/ai-connections";
import { describeError } from "@/api/errors";
import { environmentsApi } from "@/api/environments";
import { QueryErrorState, useQueryView } from "@/components/QueryView";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { queryKeys } from "@/lib/queryKeys";
import { resolveAdapterTestEnvironmentId, resolveLocalDefaultEnvironmentId, resolveManagedSandboxEnvironmentId } from "@/lib/adapter-test-environment";
import { resolveForcedKubernetesEnvironment } from "@/lib/forced-kubernetes-environment";

type Props = {
  companyId: string;
  provider: AiProvider;
  initialMethod?: AiAuthMethod;
  fixedMethod?: boolean;
  connectionId?: string;
  name: string;
  hideName?: boolean;
  nameForMethod?: (method: AiAuthMethod) => string;
  ownership: "personal" | "shared";
  agentIds: string[];
  allAgents: boolean;
  environmentId?: string;
  loginAgentId?: string;
  defaults?: ReactNode;
  disabled?: boolean;
  onComplete: (result: { connectionId: string; grantId: string; method: AiAuthMethod }) => void;
  onCancel: () => void;
};

/** Connections hosts the same provider step as agent setup, with its own save intent. */
export function AiConnectionCredentialStep(props: Props) {
  if (props.provider === "github" || ((props.provider === "google" || props.provider === "xai") && props.initialMethod === "subscription" && props.fixedMethod)) {
    return <div className="space-y-3"><p role="alert">This harness connection is no longer available.</p><Button variant="ghost" onClick={props.onCancel}>Back</Button></div>;
  }
  if (props.provider === "openrouter" || props.provider === "google" || props.provider === "xai") return <ApiKeyConnectionStep {...props} />;
  return <SubscriptionConnectionStep {...props} />;
}

function SubscriptionConnectionStep({ companyId, provider, initialMethod, fixedMethod, connectionId, name: initialName, hideName, nameForMethod, ownership, agentIds, allAgents, environmentId: suppliedEnvironmentId, loginAgentId, onComplete, onCancel, defaults, disabled }: Props) {
  const [name, setName] = useState(initialName);
  const [chosenEnvironment, setChosenEnvironment] = useState<string>();
  const client = useQueryClient();
  const envs = useQuery({ queryKey: queryKeys.environments.list(companyId), queryFn: () => environmentsApi.list(companyId) });
  const caps = useQuery({ queryKey: queryKeys.environments.capabilities(companyId), queryFn: () => environmentsApi.capabilities(companyId) });
  const settings = useQuery({ queryKey: queryKeys.instance.settings, queryFn: instanceSettingsApi.get });
  const experimental = useQuery({ queryKey: queryKeys.instance.experimentalSettings, queryFn: instanceSettingsApi.getExperimental });
  const general = useQuery({ queryKey: queryKeys.instance.generalSettings, queryFn: instanceSettingsApi.getGeneral });
  const envsView = useQueryView(envs);
  const capsView = useQueryView(caps);
  const settingsView = useQueryView(settings);
  const experimentalView = useQueryView(experimental);
  const generalView = useQueryView(general);
  const views = [envsView, capsView, settingsView, experimentalView, generalView];
  const forced = resolveForcedKubernetesEnvironment(general.data?.executionMode, envs.data ?? []);
  let environmentId: string | null = null;
  let environmentError: string | undefined;
  try {
    environmentId = forced.forced ? forced.kubernetesEnvironment?.id ?? null : resolveAdapterTestEnvironmentId({
      agentDefaultEnvironmentId: suppliedEnvironmentId ?? chosenEnvironment,
      instanceDefaultEnvironmentId: settings.data?.defaultEnvironmentId,
      localDefaultEnvironmentId: resolveLocalDefaultEnvironmentId(envs.data),
      managedSandboxOnly: experimental.data?.enableManagedSandboxOnly,
      managedSandboxEnvironmentId: resolveManagedSandboxEnvironmentId(envs.data),
      visibleEnvironmentIds: envs.data?.map((env) => env.id),
    });
  } catch (error) { environmentError = describeError(error).body; }
  const loginEnvironments = (envs.data ?? []).filter((env) =>
    env.status === "active" && (env.driver === "local" || environmentSupportsLoginPty(env, caps.data, provider === "anthropic" ? "claude_local" : "codex_local")),
  );
  // Signing in may use a different environment from later agent execution.
  // Prefer a supported login environment without changing any agent routing.
  if (!forced.forced && !suppliedEnvironmentId && !chosenEnvironment &&
      !loginEnvironments.some((env) => env.id === environmentId)) {
    environmentId = loginEnvironments[0]?.id ?? null;
  }
  const environment = envs.data?.find((env) => env.id === environmentId);
  const canLogin = environmentSupportsLoginPty(environment, caps.data, provider === "openai" ? "codex_local" : provider === "anthropic" ? "claude_local" : "unsupported");
  const loading = [envs, caps, settings, experimental, general].some((query) => query.isPending) || views.some((view) => view.kind === "reconnecting");
  const loadError = views.find((view) => view.kind === "error");
  const intent: AiConnectionLoginIntent = { provider: provider as AiConnectionLoginIntent["provider"], method: "subscription", name, ownership, agentIds, allAgents, connectionId };
  return <div className="mx-auto w-full min-w-0 max-w-xl space-y-6">
    {!hideName && <label className="block space-y-2 text-sm">Connection name<Input value={name} onChange={(event) => setName(event.target.value)} disabled={Boolean(connectionId)} /></label>}
    {!suppliedEnvironmentId && !forced.forced && loginEnvironments.length > 1 && <Select value={environmentId ?? ""} onValueChange={setChosenEnvironment}>
      <SelectTrigger aria-label="Sign-in environment"><SelectValue placeholder="Sign-in environment" /></SelectTrigger>
      <SelectContent>{loginEnvironments.map((env) => <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>)}</SelectContent>
    </Select>}
    {loadError ? <QueryErrorState size="inline" error={loadError.error} action="prepare sign-in" onRetry={loadError.retry} retrying={loadError.isFetching} />
      : environmentError ? <p role="alert" className="text-sm text-destructive">{environmentError}</p> : null}
    {defaults}
    {loading ? <p role="status" className="text-sm text-muted-foreground">Preparing sign-in…</p> : <AgentProviderConnection
      key={environmentId ?? "local"}
      companyId={companyId}
      adapterType={provider === "anthropic" ? "claude_local" : "codex_local"}
      environmentId={environmentId}
      canLogin={canLogin}
      requiresAgent={environment?.driver === "plugin"}
      agentId={environmentId === (suppliedEnvironmentId ?? settings.data?.defaultEnvironmentId) ? loginAgentId : undefined}
      localEnvironment={environment?.driver === "local"}
      onBack={onCancel}
      onConnected={() => {}}
      testConnection={async () => false}
      managedAccount={{ intent, nameForMethod, initialMethod, fixedMethod: fixedMethod ?? Boolean(connectionId), disabled: disabled || loading || Boolean(environmentError) || Boolean(loadError) || !name.trim(), onComplete: (result) => { void client.invalidateQueries({ queryKey: ["ai-connections", companyId] }); void client.invalidateQueries({ queryKey: ["tools"] }); onComplete(result); } }}
    />}
  </div>;
}

function ApiKeyConnectionStep({ companyId, provider, connectionId, name: initialName, hideName, nameForMethod, ownership, agentIds, allAgents, defaults, disabled, onComplete, onCancel }: Props) {
  const [name, setName] = useState(initialName);
  const [apiKey, setApiKey] = useState("");
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: () => aiConnectionsApi.create(companyId, { provider, method: "api_key", name: connectionId ? name : nameForMethod?.("api_key") ?? name, ownership, agentIds, allAgents, connectionId, apiKey }),
    onSuccess: (result) => { void client.invalidateQueries({ queryKey: ["ai-connections", companyId] }); void client.invalidateQueries({ queryKey: ["tools"] }); onComplete({ ...result, method: "api_key" }); },
    onSettled: () => setApiKey(""),
  });
  return <div className="mx-auto w-full min-w-0 max-w-xl space-y-4">
    {!hideName && <label className="block space-y-2 text-sm">Connection name<Input value={name} onChange={(event) => setName(event.target.value)} disabled={Boolean(connectionId)} /></label>}
    {save.error && <p role="alert" className="text-sm text-destructive">{describeError(save.error).body}</p>}
    {defaults}
    <ProviderApiKeyCard providerName={provider === "google" ? "Google" : provider === "xai" ? "xAI" : "OpenRouter"} value={apiKey} onChange={setApiKey} onSubmit={() => { if (name.trim() && apiKey.trim()) save.mutate(); }} disabled={disabled || save.isPending} placeholder={"Enter API key here"} autoFocus />
    <div className="flex justify-between gap-2"><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button disabled={disabled || !name.trim() || !apiKey.trim() || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Connecting…" : "Connect"}</Button></div>
  </div>;
}
