import { getStore, ConflictError } from "../server/store.js";
import { DAY, OWNER_KEY, HttpError, config, hash, equal, secret, passwordHash, passwordMatches, sameOrigin, jsonBody, response, failure, rateLimit, createSession, authenticate, setCookie } from "../server/security.js";

export function createAdminHandler(storeProvider = getStore) {
  return async function admin(req, res) {
    try {
      config();
      const store = storeProvider();
      if (req.method === "GET") {
        await authenticate(store, req);
        const url = new URL(req.url, "http://localhost");
        const before = url.searchParams.get("before");
        if (before && !/^\d{13}-[a-f0-9]{32}$/.test(before)) throw new HttpError(400, "Invalid page.");
        const all = (await store.keys("visits/")).filter(key => /^visits\/\d{13}-[a-f0-9]{32}\.json$/.test(key) && Number(key.slice(7, 20)) > Date.now() - 30 * DAY).sort().reverse();
        const selected = all.filter(key => !before || key < `visits/${before}.json`);
        const page = selected.slice(0, 40);
        const entries = [];
        for (let i = 0; i < page.length; i += 8) {
          const batch = await Promise.all(page.slice(i, i + 8).map(async key => { const record = await store.read(key); // Only the time and page are returned; any older location data is never sent.
          return record ? { key: key.slice(7, -5), openedAt: record.data.openedAt, page: record.data.page } : null; }));
          entries.push(...batch.filter(Boolean));
        }
        return response(res, 200, { visits: entries, total: all.length, next: selected.length > 40 ? page.at(-1).slice(7, -5) : null, retentionDays: 30 });
      }
      if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); throw new HttpError(405, "Method not allowed."); }
      sameOrigin(req);
      const data = await jsonBody(req);
      if (data.action === "setup") {
        await rateLimit(store, req, "login", 8);
        const settings = config();
        if (Date.now() > settings.setupExpiresAt || typeof data.setupToken !== "string" || data.setupToken.length > 128 || !equal(hash(data.setupToken), settings.setupHash)) throw new HttpError(403, "This setup link is invalid or has expired.");
        if (await store.read(OWNER_KEY)) throw new HttpError(409, "Admin is already set up. Please sign in with your password.");
        const owner = { password: await passwordHash(data.password), version: secret() };
        try { await store.write(OWNER_KEY, owner); }
        catch (error) { if (error instanceof ConflictError) throw new HttpError(409, "Admin is already set up. Please sign in."); throw error; }
        await createSession(store, owner, res);
        return response(res, 201, { signedIn: true });
      }
      if (data.action === "login") {
        await rateLimit(store, req, "login", 8);
        const owner = await store.read(OWNER_KEY);
        if (!owner || !await passwordMatches(data.password, owner.data.password)) throw new HttpError(401, "The password is incorrect, or setup has not been completed.");
        await createSession(store, owner.data, res);
        return response(res, 200, { signedIn: true });
      }
      const auth = await authenticate(store, req);
      if (data.action === "logout") {
        await store.remove(auth.key); setCookie(res, "", 0);
        return response(res, 200, { signedIn: false });
      }
      if (data.action === "password") {
        await rateLimit(store, req, "login", 8);
        if (!await passwordMatches(data.currentPassword, auth.owner.data.password)) throw new HttpError(401, "The current password is incorrect.");
        const owner = { password: await passwordHash(data.password), version: secret() };
        await store.write(OWNER_KEY, owner, { etag: auth.owner.etag });
        await createSession(store, owner, res);
        await store.remove(auth.key);
        return response(res, 200, { changed: true });
      }
      if (data.action === "delete") {
        if (!/^\d{13}-[a-f0-9]{32}$/.test(data.key || "")) throw new HttpError(400, "Invalid visit.");
        await store.remove(`visits/${data.key}.json`);
        return response(res, 200, { deleted: true });
      }
      throw new HttpError(400, "Unknown action.");
    } catch (error) { failure(res, error); }
  };
}
export default createAdminHandler();
