import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(process.cwd(), "..");
const sourcePublicDir = path.join(rootDir, "web", "public");
const targetPublicDir = path.join(process.cwd(), "public");

function copyDir(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

copyDir(path.join(sourcePublicDir, "viewer_v1"), path.join(targetPublicDir, "viewer_v1"));
copyDir(path.join(sourcePublicDir, "teaser"), path.join(targetPublicDir, "teaser"));

console.log("[public-teaser] synced shared public assets");
