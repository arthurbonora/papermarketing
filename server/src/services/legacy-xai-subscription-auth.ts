const GROK_IDENTITY_KEY_RE =
  /^.+::[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** One parsed Grok auth payload: the composite identity key and its value object. */
export interface GrokAuthPayload {
  identityKey: string;
  value: Record<string, unknown>;
}

/**
 * Parses a decoded JSON value into a {@link GrokAuthPayload}. Returns null when
 * the value is not an object, holds zero or more than one top-level key, or the
 * single key does not match the `<issuer>::<uuid>` shape, or its value is not an
 * object. Never assumes a fixed key name.
 */
export function parseGrokAuthPayload(raw: unknown): GrokAuthPayload | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const keys = Object.keys(raw as Record<string, unknown>);
  if (keys.length !== 1) return null;
  const [identityKey] = keys as [string];
  if (!GROK_IDENTITY_KEY_RE.test(identityKey)) return null;
  const value = (raw as Record<string, unknown>)[identityKey];
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return { identityKey, value: value as Record<string, unknown> };
}

/** True when the payload value holds the two fields a run needs to authenticate. */
export function hasUsableGrokAuthValue(value: Record<string, unknown>): boolean {
  const key = value.key;
  const refreshToken = value.refresh_token;
  return (
    typeof key === "string" &&
    key.trim().length > 0 &&
    typeof refreshToken === "string" &&
    refreshToken.trim().length > 0
  );
}
