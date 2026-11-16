import { get, put, list, del, BlobPreconditionFailedError } from "@vercel/blob";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, readdir, unlink } from "node:fs/promises";
import path from "node:path";

export class ConflictError extends Error {}

export class BlobStore {
  async read(key) {
    const blob = await get(key, { access: "private", useCache: false });
    return blob ? { data: await new Response(blob.stream).json(), etag: blob.blob.etag } : null;
  }
  async write(key, data, { etag, ttlDays } = {}) {
    try {
      return await put(key, JSON.stringify(data), {
        access: "private", contentType: "application/json", addRandomSuffix: false,
        allowOverwrite: Boolean(etag), ...(etag ? { ifMatch: etag } : {}),
        ...(ttlDays ? { ttlDays } : {}), cacheControlMaxAge: 60,
      });
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError || /already exists/i.test(error.message)) throw new ConflictError();
      throw error;
    }
  }
  async keys(prefix) {
    const keys = [];
    let cursor;
    do {
      const result = await list({ prefix, limit: 1000, cursor });
      keys.push(...result.blobs.map(blob => blob.pathname));
      cursor = result.hasMore ? result.cursor : undefined;
      if (keys.length > 20000) throw new Error("Activity history is too large");
    } while (cursor);
    return keys;
  }
  async remove(key) { await del(key); }
}

// Local development only. Never selected inside a Vercel deployment.
export class FileStore {
  constructor(directory) { this.directory = path.resolve(directory); this.queue = Promise.resolve(); }
  file(key) {
    if (!/^[a-zA-Z0-9/_-]+\.json$/.test(key)) throw new Error("Invalid storage key");
    const target = path.resolve(this.directory, key);
    if (!target.startsWith(`${this.directory}${path.sep}`)) throw new Error("Invalid storage path");
    return target;
  }
  async read(key) {
    try {
      const result = JSON.parse(await readFile(this.file(key), "utf8"));
      if (result.expiresAt && result.expiresAt <= Date.now()) return null;
      return result;
    } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }
  write(key, data, { etag, ttlDays } = {}) {
    const task = this.queue.then(async () => {
      const existing = await this.read(key);
      if (etag ? existing?.etag !== etag : Boolean(existing)) throw new ConflictError();
      const file = this.file(key);
      const next = { data, etag: createHash("sha256").update(JSON.stringify(data) + randomUUID()).digest("hex"), expiresAt: ttlDays ? Date.now() + ttlDays * 86400000 : null };
      await mkdir(path.dirname(file), { recursive: true });
      const temporary = `${file}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
      await rename(temporary, file);
      return { etag: next.etag };
    });
    this.queue = task.catch(() => {});
    return task;
  }
  async keys(prefix) {
    const keys = [];
    const walk = async (directory) => {
      for (const entry of await readdir(directory, { withFileTypes: true }).catch(error => { if (error.code === "ENOENT") return []; throw error; })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) await walk(target);
        else if (entry.name.endsWith(".json")) {
          const key = path.relative(this.directory, target).split(path.sep).join("/");
          if (key.startsWith(prefix) && await this.read(key)) keys.push(key);
        }
      }
    };
    await walk(this.directory);
    return keys;
  }
  async remove(key) { await unlink(this.file(key)).catch(error => { if (error.code !== "ENOENT") throw error; }); }
}

let instance;
export function getStore() {
  if (!instance) instance = !process.env.VERCEL && process.env.LOCAL_ACTIVITY_DIRECTORY
    ? new FileStore(process.env.LOCAL_ACTIVITY_DIRECTORY) : new BlobStore();
  return instance;
}
