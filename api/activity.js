import { randomBytes } from "node:crypto";
import { getStore } from "../server/store.js";
import { HttpError, config, sameOrigin, jsonBody, rateLimit, response, failure, authenticate } from "../server/security.js";

// Logs only the time the gift was opened and the page it opened on.
export function createActivityHandler(storeProvider = getStore) {
  return async function activity(req, res) {
    try {
      if (req.method !== "POST") { res.setHeader("Allow", "POST"); throw new HttpError(405, "Method not allowed."); }
      sameOrigin(req); config();
      const data = await jsonBody(req);
      const store = storeProvider();
      // Don't count an authenticated owner's own visits to the gift.
      try { await authenticate(store, req); return response(res, 200, { ignored: true }); }
      catch (error) { if (!(error instanceof HttpError) || error.status !== 401) throw error; }
      await rateLimit(store, req, "activity", 40);
      const openedAt = Date.now();
      const id = randomBytes(16).toString("hex");
      const page = /^(welcome|surprise|envelopes|letter\/0[1-6])$/.test(data.page || "") ? data.page : "welcome";
      await store.write(`visits/${openedAt}-${id}.json`, { id, openedAt, page }, { ttlDays: 30 });
      return response(res, 201, { logged: true });
    } catch (error) { failure(res, error); }
  };
}
export default createActivityHandler();
