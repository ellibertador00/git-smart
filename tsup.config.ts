import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  outDir: "dist",
  dts: false,
  clean: true,
  target: "node18",
});
