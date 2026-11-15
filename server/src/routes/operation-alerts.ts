import { Router } from "express";
import { forbidden } from "../errors.js";
import { listCompanyOperationAlerts } from "../services/operation-alerts.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";

export function operationAlertRoutes() {
  const router = Router();

  router.get("/companies/:companyId/operation-alerts", (req, res) => {
    const companyId = req.params.companyId;
    assertBoard(req);
    assertCompanyAccess(req, companyId);
    const membership = req.actor.memberships?.find((item) => item.companyId === companyId);
    const isCompanyAdmin = membership?.status === "active"
      && (membership.membershipRole === "owner" || membership.membershipRole === "admin");
    if (req.actor.source !== "local_implicit" && !req.actor.isInstanceAdmin && !isCompanyAdmin) {
      throw forbidden("Company admin access required");
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(listCompanyOperationAlerts(companyId));
  });

  return router;
}
