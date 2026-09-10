#!/usr/bin/env node
/**
 * Lint local sin red (CI-friendly).
 * Usa `npm run lint:doctor` para expo-doctor completo cuando hay red.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const required = ["package.json", "app.json", "App.js", "index.js", "app.config.js"];

for (const file of required) {
  const path = join(root, file);
  if (!existsSync(path)) {
    console.error(`hamobile lint: falta ${file}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (pkg.name !== "hamobile") {
  console.error(`hamobile lint: package name debe ser "hamobile", es "${pkg.name}"`);
  process.exit(1);
}

const app = JSON.parse(readFileSync(join(root, "app.json"), "utf8"));
if (!app.expo?.slug || !app.expo?.android?.package || !app.expo?.ios?.bundleIdentifier) {
  console.error("hamobile lint: app.json incompleto (slug/android.package/ios.bundleIdentifier)");
  process.exit(1);
}

console.log("hamobile lint: config ok");
