import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "../dist/index.js");
const SHEBANG = "#!/usr/bin/env node";

if (!existsSync(outputPath)) {
  process.exit(0);
}

let content = readFileSync(outputPath, "utf8");

if (content.charCodeAt(0) === 0xfeff) {
  content = content.slice(1);
}

const lines = content.split(/\r?\n/);
while (lines.length && lines[0].trim() === "") {
  lines.shift();
}
while (lines.length && lines[0].startsWith("#!")) {
  lines.shift();
}

const normalized = `${SHEBANG}\n${lines.join("\n")}`.replace(/\n+$/, "\n");
writeFileSync(outputPath, normalized);
