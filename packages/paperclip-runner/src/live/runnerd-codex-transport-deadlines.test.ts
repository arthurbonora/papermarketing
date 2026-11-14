import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it, vi } from "vitest";
import { DurablePrpControlPlane } from "../control-plane/durable-prp-control-plane.js";
import * as durableControlPlane from "../control-plane/durable-prp-control-plane.js";
import {
  createCapabilityRunnerdCodexTransport,
  defaultCapabilityRunnerdBinary as qualifiedCapabilityRunnerdBinary,
} from "./runnerd-codex-transport.js";

// These regressions must cross real production timing boundaries. Keep their
// waits intact, but let the existing file worker pool overlap them with the
// rest of the transport suite instead of extending its serial critical path.
const defaultCapabilityRunnerdBinary = () =>
  process.env.PAPERCLIP_ATTACH_TRANSITION_RUNNER ?? qualifiedCapabilityRunnerdBinary();
const fakeCodex = resolve(import.meta.dirname, "../../runner/target/debug/fake-codex-app-server");
function fakeCodexArgs(stateDirectory: string, ...args: string[]): string[] {
  return ["--state-file", join(stateDirectory, "fake-codex-state.json"), ...args];
}

it("adopts a durably accepted turn whose start notification outlives the turn-start bound", async () => {
  // A loaded host can accept a turn (durable command result with its provider
  // turn id) and start it only after the turn-start bound. The provider still
  // runs that turn, so failing the start would abandon a live turn.
  const stateDirectory = await mkdtemp(join(tmpdir(), "runnerd-late-turn-started-"));
  const callsPath = join(stateDirectory, "calls.log");
  const bundle = createCapabilityRunnerdCodexTransport({
    runnerBinary: defaultCapabilityRunnerdBinary(), codexCommand: fakeCodex,
    codexArgs: fakeCodexArgs(stateDirectory, "--turn-started-delay-ms", "12000", "--fail-turn-immediately", "--call-log", callsPath),
    stateDirectory, turnStartTimeoutMs: 8_000,
  });
  try {
    await bundle.transport.request("thread/start", { cwd: tmpdir(), dynamicTools: [] });
    const started = await bundle.transport.request("turn/start", { input: [{ type: "text", text: "Start late." }] });
    expect(started).toMatchObject({ turn: { id: "provider-turn-1" } });
    const methods: string[] = [];
    for await (const notification of bundle.transport.notifications()) {
      methods.push(notification.method);
      if (notification.method === "turn/completed") {
        expect(notification.params).toMatchObject({ turnId: "provider-turn-1" });
        break;
      }
    }
    expect(methods).toContain("turn/started");
    const calls = (await readFile(callsPath, "utf8")).trim().split(/\r?\n/);
    expect(calls.filter(call => call === "turn/start")).toHaveLength(1);
  } finally {
    await bundle.transport.close().catch(() => undefined);
    await rm(stateDirectory, { recursive: true, force: true });
  }
}, 60_000);

it("does not adopt an accepted turn the runner no longer reports active", async () => {
  // The provider accepts the turn, then its process ends before the turn
  // starts. The accepted turn is not live, so the start fails within its bound.
  const stateDirectory = await mkdtemp(join(tmpdir(), "runnerd-lost-turn-start-"));
  const bundle = createCapabilityRunnerdCodexTransport({
    runnerBinary: defaultCapabilityRunnerdBinary(), codexCommand: fakeCodex,
    codexArgs: fakeCodexArgs(stateDirectory, "--exit-before-turn-started"),
    stateDirectory, turnStartTimeoutMs: 2_000,
  });
  try {
    await bundle.transport.request("thread/start", { cwd: tmpdir(), dynamicTools: [] });
    const started = Date.now();
    // The runner may still list the turn after relaunching its provider; the
    // process that accepted it is gone, so the turn is not adopted.
    await expect(bundle.transport.request("turn/start", { input: [{ type: "text", text: "Lose this turn." }] }))
      .rejects.toThrow("runnerd did not report the provider turn identity");
    // The adoption check stays inside the configured bound (plus scheduling slack).
    expect(Date.now() - started).toBeLessThan(2_000 + 1_500);
  } finally {
    await bundle.transport.close().catch(() => undefined);
    await rm(stateDirectory, { recursive: true, force: true });
  }
}, 60_000);

it("fails a pending turn start at once with the runner's own terminal failure", async () => {
  // The runner can fail an accepted turn before its turn/started arrives
  // (RC-20d: turn_binding_mismatch). That terminal is final, so the start must
  // report it at once rather than wait out the bound under a generic message.
  const stateDirectory = await mkdtemp(join(tmpdir(), "runnerd-failed-turn-start-"));
  const callsPath = join(stateDirectory, "calls.log");
  const bundle = createCapabilityRunnerdCodexTransport({
    runnerBinary: defaultCapabilityRunnerdBinary(), codexCommand: fakeCodex,
    codexArgs: fakeCodexArgs(stateDirectory, "--foreign-usage-before-turn-started",
      "--turn-started-delay-ms", "20000", "--call-log", callsPath),
    stateDirectory, turnStartTimeoutMs: 15_000,
  });
  try {
    await bundle.transport.request("thread/start", { cwd: tmpdir(), dynamicTools: [] });
    const started = Date.now();
    await expect(bundle.transport.request("turn/start", { input: [{ type: "text", text: "Fail before start." }] }))
      .rejects.toThrow("turn_binding_mismatch");
    expect(Date.now() - started).toBeLessThan(5_000);
    const calls = (await readFile(callsPath, "utf8")).trim().split(/\r?\n/);
    expect(calls.filter(call => call === "turn/start")).toHaveLength(1);
  } finally {
    await bundle.transport.close().catch(() => undefined);
    await rm(stateDirectory, { recursive: true, force: true });
  }
}, 60_000);

it("keeps a quiet active Codex turn in the same process across connection lease expiry", async () => {
  const stateDirectory = await mkdtemp(join(tmpdir(), "runnerd-renew-active-"));
  const callsPath = join(stateDirectory, "calls.log");
  const cores: DurablePrpControlPlane[] = [];
  const OriginalCore = durableControlPlane.DurablePrpControlPlane;
  const coreSpy = vi.spyOn(durableControlPlane, "DurablePrpControlPlane")
    .mockImplementation(function(options: ConstructorParameters<typeof OriginalCore>[0]) {
      const core = new OriginalCore({ ...options, connectionLeaseTtlMs: 60_000 });
      cores.push(core);
      return core;
    } as unknown as typeof OriginalCore);
  const bundle = createCapabilityRunnerdCodexTransport({
    runnerBinary: defaultCapabilityRunnerdBinary(), codexCommand: fakeCodex,
    codexArgs: fakeCodexArgs(stateDirectory, "--hold-turn", "--record-process-start", "--call-log", callsPath),
    stateDirectory, runnerReconnectGraceMs: 5_000,
  });
  try {
    const opened = await bundle.transport.request("thread/start", { cwd: tmpdir(), dynamicTools: [] });
    await bundle.transport.request("turn/start", { input: [{ type: "text", text: "Keep working quietly." }] });
    const runnerPid = bundle.evidence().runnerPid;
    const codexPid = bundle.evidence().codexPid;
    expect(runnerPid).toBeGreaterThan(0);
    expect(codexPid).toBeGreaterThan(0);
    const core = cores[0]!;
    const original = structuredClone(Object.values(core.store.state.leases)[0]!);
    await vi.waitFor(() => {
      expect(Date.now()).toBeGreaterThan(original.expiresAtUnixMs + 1_000);
    }, { timeout: 75_000, interval: 1_000 });
    const current = Object.values(core.store.state.leases)[0]!;
    expect(current.expiresAtUnixMs).toBeGreaterThan(original.expiresAtUnixMs);
    expect(current.leaseId).toBe(original.leaseId);
    expect(core.store.state.connectionCount).toBe(1);
    expect(bundle.evidence().runnerPid).toBe(runnerPid);
    expect(bundle.evidence().codexPid).toBe(codexPid);
    process.kill(runnerPid!, 0);
    process.kill(codexPid!, 0);
    const calls = (await readFile(callsPath, "utf8")).trim().split(/\r?\n/);
    expect(calls.filter(call => call === "process-start")).toHaveLength(1);
    expect(calls.filter(call => call === "thread/start")).toHaveLength(1);
    expect(calls.filter(call => call === "turn/start")).toHaveLength(1);
    expect(calls).not.toContain("turn/interrupt");
    expect(calls).not.toContain("thread/resume");
    const state = JSON.parse(await readFile(join(stateDirectory, "fake-codex-state.json"), "utf8"));
    expect(state.threadId).toBe((opened.thread as { id: string }).id);
    expect(state.activeTurnId).toBe("provider-turn-1");
  } finally {
    await bundle.transport.close();
    coreSpy.mockRestore();
    await rm(stateDirectory, { recursive: true, force: true });
  }
}, 90_000);
