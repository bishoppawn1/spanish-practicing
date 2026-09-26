import { mkdir, cp, rm, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const asset of ["index.html", "styles.css", "favicon.svg", "src"]) {
  await cp(new URL(asset, root), new URL(asset, dist), { recursive: true });
}
await writeFile(new URL(".nojekyll", dist), "");
console.log("Built static site in dist/");
