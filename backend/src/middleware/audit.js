import { diffChanges, record } from "../modules/audit/audit.service.js";

// Writes an audit entry after a successful request. Use it in a route, just before the controller:
//   router.patch("/:id", validate({ body }), audit({ entity: "Vehicle", action: "UPDATE", load: (req) => getVehicle(req.params.id) }), controller.update);
//
//   entity  module name shown in the Audit log, e.g. "Vehicle"
//   action  "CREATE" | "UPDATE" | "DELETE" | ... or (req, body, before) => action
//   load    optional (req) => the record as it is now, used to list the before / after values
// The user comes from req.user (set by protect / attachUser). Failed requests (4xx, 5xx) are not logged.

const VERBS = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  APPROVE: "Approved",
  REJECT: "Rejected",
  REQUEST_CHANGES: "Requested changes on",
  CANCEL: "Cancelled",
};

export default function audit({ entity, action, load }) {
  return async (req, res, next) => {
    // The record before the change (a failed lookup just means there is nothing to compare)
    let before = null;
    if (load) {
      try {
        before = await load(req);
      } catch {
        before = null;
      }
    }

    const send = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400) {
        const result = body && typeof body === "object" ? body : {};
        const type = typeof action === "function" ? action(req, result, before) : action;
        const isDelete = type === "DELETE";
        const code = result.id ?? result.code ?? before?.id ?? req.params.id;
        const name = before?.name ?? result.name ?? before?.plate ?? result.plate;
        const verb = type === "CREATE" && result.isDraft ? "Saved draft" : (VERBS[type] ?? type);

        // Not awaited: the response should not wait for the audit write
        record({
          user: req.user,
          action: type,
          entity,
          entityCode: code,
          description: `${verb} ${entity.toLowerCase()} ${code ?? ""}${name ? ` (${name})` : ""}`.replace(/\s+/g, " ").trim(),
          changes: diffChanges(before, isDelete ? null : result),
          details: { method: req.method, path: req.originalUrl.split("?")[0], status: res.statusCode },
          ip: req.ip,
        });
      }
      return send(body);
    };

    next();
  };
}
