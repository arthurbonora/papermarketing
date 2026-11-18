function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function missingToolBatch(value: unknown): { logId: string | null; tools: string[] } | null {
  const envelope = record(value);
  const batch = record(envelope?.data);
  const results = batch?.results;
  if (envelope?.successful !== false || !Array.isArray(results) || results.length === 0 ||
      batch?.success_count !== 0 || batch.error_count !== results.length || batch.total_count !== results.length) {
    return null;
  }

  const tools: string[] = [];
  for (const result of results) {
    const item = record(result);
    const response = record(item?.response);
    const slug = item?.tool_slug;
    const missing = typeof response?.error === "string"
      ? /^(?:MCP tool error: )?MCP error -32602: Tool ([a-zA-Z0-9_.:-]{1,128}) not found$/.exec(response.error)
      : null;
    if (response?.successful !== false || !missing || typeof slug !== "string" || !/^[A-Z][A-Z0-9_]{1,127}$/.test(slug)) {
      return null;
    }
    tools.push(`${slug}: MCP tool error: MCP error -32602: Tool ${missing[1]} not found`);
  }
  const logId = typeof envelope.log_id === "string" && /^log_[A-Za-z0-9_-]{1,64}$/.test(envelope.log_id)
    ? envelope.log_id : null;
  return { logId, tools };
}

export function composioUnavailableToolMessage(result: unknown): string | null {
  const reply = record(result);
  let batch = missingToolBatch(reply?.structuredContent);
  if (!batch && Array.isArray(reply?.content) && reply.content.length === 1) {
    const content = record(reply.content[0]);
    if (content?.type !== "text" || typeof content.text !== "string" || content.text.length > 512_000) return null;
    try {
      batch = missingToolBatch(JSON.parse(content.text));
    } catch {
      return null;
    }
  }
  if (!batch) return null;
  const log = batch.logId ? ` Composio log ${batch.logId}.` : "";
  return `Composio's upstream MCP server could not find the requested tool(s). ${batch.tools.join(". ")}${log}`;
}
