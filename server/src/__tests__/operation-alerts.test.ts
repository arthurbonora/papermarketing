import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/error-handler.js";
import { operationAlertRoutes } from "../routes/operation-alerts.js";
import { listCompanyOperationAlerts, trackCompanyOperation } from "../services/operation-alerts.js";

function boardApp(companyId: string, membershipRole: "admin" | "viewer") {
  const app = express();
  app.use((req, _res, next) => {
    req.actor = {
      type: "board",
      source: "session",
      userId: "board-user",
      companyIds: [companyId],
      memberships: [{ companyId, membershipRole, status: "active" }],
    };
    next();
  });
  app.use(operationAlertRoutes());
  app.use(errorHandler);
  return app;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("operation alerts", () => {
  it("shows one alert to the company admin and records when the operation ends", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const companyId = randomUUID();
    const otherCompanyId = randomUUID();
    const operation = Promise.withResolvers<string>();
    const tracked = trackCompanyOperation(companyId, "secret_write", () => operation.promise);
    const path = `/companies/${companyId}/operation-alerts`;
    try {
      const admin = request(boardApp(companyId, "admin"));
      await admin.get(path).expect(200, []);
      vi.setSystemTime(new Date("2026-01-01T12:00:15Z"));
      const active = await admin.get(path).expect("Cache-Control", "no-store").expect(200);
      expect(active.body).toEqual([{
        id: expect.any(String),
        kind: "secret_write",
        startedAt: "2026-01-01T12:00:00.000Z",
        detectedAt: "2026-01-01T12:00:15.000Z",
        resolvedAt: null,
      }]);
      expect((await admin.get(path).expect(200)).body).toEqual(active.body);
      await request(boardApp(companyId, "viewer")).get(path).expect(403);
      await request(boardApp(otherCompanyId, "admin")).get(path).expect(403);
      await request(boardApp(otherCompanyId, "admin"))
        .get(`/companies/${otherCompanyId}/operation-alerts`).expect(200, []);

      vi.setSystemTime(new Date("2026-01-01T12:00:20Z"));
      operation.resolve("original result");
      await expect(tracked).resolves.toBe("original result");
      await admin.get(path).expect(200, [{
        ...active.body[0],
        resolvedAt: "2026-01-01T12:00:20.000Z",
      }]);
      vi.setSystemTime(new Date("2026-01-02T12:00:20Z"));
      await admin.get(path).expect(200, []);
    } finally {
      operation.resolve("original result");
      await tracked;
    }
  });

  it("tracks a routine dispatch only after 60 seconds and preserves its error", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const companyId = randomUUID();
    const operation = Promise.withResolvers<never>();
    const tracked = trackCompanyOperation(companyId, "routine_dispatch", () => operation.promise);
    const failure = new Error("operation failed");
    try {
      vi.setSystemTime(new Date("2026-01-01T12:00:59Z"));
      expect(listCompanyOperationAlerts(companyId)).toEqual([]);
      vi.setSystemTime(new Date("2026-01-01T12:01:00Z"));
      expect(listCompanyOperationAlerts(companyId)).toHaveLength(1);
      const result = expect(tracked).rejects.toBe(failure);
      operation.reject(failure);
      await result;
      expect(listCompanyOperationAlerts(companyId)).toMatchObject([{
        kind: "routine_dispatch",
        resolvedAt: "2026-01-01T12:01:00.000Z",
      }]);
    } finally {
      operation.reject(failure);
      await tracked.catch(() => {});
    }
  });

  it("omits operations that finish before the threshold", async () => {
    const companyId = randomUUID();
    await trackCompanyOperation(companyId, "secret_write", async () => {});
    expect(listCompanyOperationAlerts(companyId)).toEqual([]);
  });
});
