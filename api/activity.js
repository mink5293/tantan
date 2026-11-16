import { randomBytes } from "node:crypto";
import { getStore, ConflictError } from "../server/store.js";
import { DAY, HttpError, config, sameOrigin, jsonBody, rateLimit, response, failure, signedVisit, readVisitToken, authenticate } from "../server/security.js";

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
      if (!data.visitToken) {
        if (data.location || data.consent) throw new HttpError(400, "Start a visit before sharing a location.");
        const createdAt = Date.now();
        const id = randomBytes(16).toString("hex");
        const page = /^(welcome|surprise|envelopes|letter\/0[1-6])$/.test(data.page || "") ? data.page : "welcome";
        await store.write(`visits/${createdAt}-${id}.json`, { id, openedAt: createdAt, page, location: null, consent: "not-shared" }, { ttlDays: 30 });
        return response(res, 201, { visitToken: signedVisit(id, createdAt) });
      }
      const visit = readVisitToken(data.visitToken);
      if (!["share", "withdraw"].includes(data.consent)) throw new HttpError(400, "Choose whether to share your location.");
      let location = null;
      if (data.consent === "share") {
        const { latitude, longitude, accuracy, capturedAt } = data.location || {};
        if (![latitude, longitude, accuracy, capturedAt].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0 || accuracy > 100000 || Math.abs(Date.now() - capturedAt) > 15 * 60000) throw new HttpError(400, "The browser returned an invalid or old location. Please try again.");
        location = { latitude: Math.round(latitude * 1e6) / 1e6, longitude: Math.round(longitude * 1e6) / 1e6, accuracy: Math.round(accuracy), capturedAt, sharedAt: Date.now() };
      }
      for (let attempt = 0; attempt < 4; attempt++) {
        const stored = await store.read(visit.key);
        if (!stored || Date.now() - stored.data.openedAt > 30 * DAY) throw new HttpError(410, "This visit is no longer available.");
        try {
          await store.write(visit.key, { ...stored.data, location, consent: location ? "shared" : "withdrawn" }, { etag: stored.etag, ttlDays: Math.max(1, Math.ceil((visit.createdAt + 30 * DAY - Date.now()) / DAY)) });
          return response(res, 200, { shared: Boolean(location) });
        } catch (error) { if (!(error instanceof ConflictError)) throw error; }
      }
      throw new HttpError(409, "The visit changed. Please try again.");
    } catch (error) { failure(res, error); }
  };
}
export default createActivityHandler();
