import { cp, mkdir, readdir, unlink, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { letters, mascots } from "../js/content.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
const files = new Set(["index.html"]);
async function collect(directory) {
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await collect(relative);
    else files.add(relative);
  }
}
for (const directory of ["js", "css", "assets", "admin"]) await collect(directory);
for (const asset of Object.values(mascots)) {
  if (asset.image) files.add(asset.image);
  if (asset.still) files.add(asset.still);
}
for (const letter of letters) {
  if (letter.mediaSource) files.add(letter.mediaSource);
  if (letter.mascotImage) files.add(letter.mascotImage);
}
const localFiles = [...files].filter((file) => !/^https?:\/\//i.test(file));
for (const file of localFiles) {
  const resolved = path.resolve(root, file);
  if (path.relative(root, resolved).startsWith("..")) throw new Error(`Asset must be inside the project: ${file}`);
  await access(resolved);
}
// Remove only previously built files inside this project's verified dist path.
async function prune(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink in build output: ${target}`);
    if (entry.isDirectory()) await prune(target);
    else if (!files.has(path.relative(output, target).split(path.sep).join("/"))) await unlink(target);
  }
}
await mkdir(output, { recursive: true });
await prune(output);
for (const file of localFiles) {
  const destination = path.join(output, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(root, file), destination);
}
console.log(`Built ${localFiles.length} files in dist/. Ready for Vercel.`);
