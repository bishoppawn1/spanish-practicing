import { mkdir, cp, rm, writeFile, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const asset of ["index.html", "styles.css", "favicon.svg", "src"]) {
  await cp(new URL(asset, root), new URL(asset, dist), { recursive: true });
}
// Give each release its own asset URLs so cached modules cannot mix versions.
const modules = (await readdir(new URL("src/", dist)))
  .filter((name) => name.endsWith(".js"))
  .sort();
const hash = createHash("sha256");
for (const file of [
  "index.html",
  "styles.css",
  "favicon.svg",
  ...modules.map((name) => `src/${name}`),
]) {
  hash.update(await readFile(new URL(file, dist)));
}
const version = hash.digest("hex").slice(0, 12);
for (const name of modules) {
  const file = new URL(`src/${name}`, dist);
  const content = await readFile(file, "utf8");
  await writeFile(
    file,
    content.replace(
      /(from\s+["'])(\.\/[^"'?]+\.js)(?:\?v=[^"']+)?(["'])/g,
      `$1$2?v=${version}$3`,
    ),
  );
}
const index = new URL("index.html", dist);
await writeFile(
  index,
  (await readFile(index, "utf8")).replace(
    /((?:src|href)="\.\/[^"?]+\.(?:js|css|svg))(?:\?v=[^"]+)?"/g,
    `$1?v=${version}"`,
  ),
);
await writeFile(new URL(".nojekyll", dist), "");
console.log("Built static site in dist/");
