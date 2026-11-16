import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ConflictError } from "./store.js";

const scryptAsync = promisify(scrypt);
export const DAY = 86400000;
export const OWNER_KEY = "security/owner.json";
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function config() {
  let value;
  try { value = JSON.parse(process.env.TANTAN_ADMIN_CONFIG || "{}"); } catch { /* Fail closed. */ }
  if (!value?.sessionSecret || value.sessionSecret.length < 43 || !/^[a-f0-9]{64}$/.test(value.setupHash || "")) throw new HttpError(503, "Private activity logging is not configured yet.");
  return value;
}
export function hash(value) { return createHash("sha256").update(value).digest("hex"); }
export function equal(a, b) {
  const first = Buffer.from(String(a));
  const second = Buffer.from(String(b));
  return first.length === second.length && timingSafeEqual(first, second);
}
export function secret() { return randomBytes(32).toString("base64url"); }
export async function passwordHash(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 128) throw new HttpError(400, "Use a password between 12 and 128 characters.");
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { salt, hash: key.toString("hex") };
}
export async function passwordMatches(password, stored) {
  if (typeof password !== "string" || password.length > 128 || !stored) return false;
  const key = await scryptAsync(password, stored.salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return equal(key.toString("hex"), stored.hash);
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const scheme = process.env.VERCEL ? "https" : "http";
  if (!origin || origin !== `${scheme}://${host}` || req.headers["sec-fetch-site"] === "cross-site") throw new HttpError(403, "This request must come from the website.");
}
export async function jsonBody(req) {
  if (!String(req.headers["content-type"] || "").startsWith("application/json")) throw new HttpError(415, "JSON is required.");
  if (Number(req.headers["content-length"]) > 4096) throw new HttpError(413, "Request is too large.");
  let body;
  if (req.body !== undefined) body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  else {
    const chunks = []; let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 4096) throw new HttpError(413, "Request is too large.");
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks).toString("utf8");
  }
  if (Buffer.byteLength(body) > 4096) throw new HttpError(413, "Request is too large.");
  try {
    const data = JSON.parse(body);
    if (!data || Array.isArray(data) || typeof data !== "object") throw new Error();
    return data;
  } catch { throw new HttpError(400, "Invalid request."); }
}
export function response(res, status, data) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.statusCode = status;
  res.end(JSON.stringify(data));
}
export function failure(res, error) {
  response(res, error instanceof HttpError ? error.status : 503,
    { error: error instanceof HttpError ? error.message : "This service is temporarily unavailable. Please try again." });
}
export async function rateLimit(store, req, scope, limit, minutes = 15) {
  // The raw IP is never stored. This rotating HMAC is only used for abuse limits.
  const ip = process.env.VERCEL ? String(req.headers["x-vercel-forwarded-for"] || req.headers["x-forwarded-for"] || "unknown").split(",")[0] : req.socket?.remoteAddress || "local";
  const bucket = Math.floor(Date.now() / (minutes * 60000));
  const digest = createHmac("sha256", config().sessionSecret).update(`${scope}:${ip}:${bucket}`).digest("hex");
  const key = `security/limits/${digest}.json`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await store.read(key);
    const count = existing?.data.count || 0;
    if (count >= limit) throw new HttpError(429, `Please wait up to ${minutes} minutes before trying again.`);
    try { await store.write(key, { count: count + 1 }, { etag: existing?.etag, ttlDays: 1 }); return; }
    catch (error) { if (!(error instanceof ConflictError)) throw error; }
  }
  throw new HttpError(429, "Please wait a moment and try again.");
}
export function signedVisit(id, createdAt) {
  const payload = Buffer.from(JSON.stringify({ id, createdAt })).toString("base64url");
  return `${payload}.${createHmac("sha256", config().sessionSecret).update(`visit:${payload}`).digest("base64url")}`;
}
export function readVisitToken(token) {
  if (typeof token !== "string" || token.length > 512) throw new HttpError(403, "Visit has expired. Refresh the page to start again.");
  const [payload, signature, extra] = token.split(".");
  const expected = createHmac("sha256", config().sessionSecret).update(`visit:${payload}`).digest("base64url");
  if (extra || !equal(signature, expected)) throw new HttpError(403, "Invalid visit.");
  let value;
  try { value = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { throw new HttpError(403, "Invalid visit."); }
  if (!/^[a-f0-9]{32}$/.test(value.id) || !Number.isSafeInteger(value.createdAt) || value.createdAt > Date.now() + 60000 || Date.now() - value.createdAt > DAY) throw new HttpError(403, "Visit has expired. Refresh the page to start again.");
  return { ...value, key: `visits/${value.createdAt}-${value.id}.json` };
}
export function cookieName() { return process.env.VERCEL ? "__Host-tantan-admin" : "tantan-admin"; }
function cookieToken(req) {
  const item = String(req.headers.cookie || "").split(";").map(part => part.trim()).find(part => part.startsWith(`${cookieName()}=`));
  const token = item?.slice(cookieName().length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token || "") ? token : null;
}
export function setCookie(res, token, maxAge = 28800) {
  res.setHeader("Set-Cookie", `${cookieName()}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.VERCEL ? "; Secure" : ""}`);
}
export async function createSession(store, owner, res) {
  const token = secret();
  await store.write(`security/sessions/${hash(token)}.json`, { expiresAt: Date.now() + 8 * 3600000, version: owner.version }, { ttlDays: 1 });
  setCookie(res, token);
}
export async function authenticate(store, req) {
  const token = cookieToken(req);
  if (!token) throw new HttpError(401, "Please sign in.");
  const key = `security/sessions/${hash(token)}.json`;
  const [session, owner] = await Promise.all([store.read(key), store.read(OWNER_KEY)]);
  if (!session || session.data.expiresAt <= Date.now() || !owner || session.data.version !== owner.data.version) throw new HttpError(401, "Your session has expired. Please sign in again.");
  return { key, owner };
}
