// node render.mjs [prefijo]  -> png/<id>-<tema>.png (390x844 @2x), mudo
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(new URL("../../../x.js", import.meta.url))("playwright-core");
const DIR = fileURLToPath(new URL(".", import.meta.url)).split("\\").join("/");
mkdirSync(DIR + "png", { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", args: ["--mute-audio", "--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("file:///" + DIR + "maq.html?s=x");
const pref = process.argv[2] || "";
const ids = (await p.evaluate(() => Object.keys(P))).filter((k) => k.startsWith(pref));
for (const id of ids) for (const t of ["oscuro", "claro"]) {
  await p.goto("file:///" + DIR + "maq.html?s=" + encodeURIComponent(id) + "&t=" + t);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: DIR + "png/" + id + "-" + t + ".png" });
}
console.log(ids.length, "pantallas");
await b.close();
