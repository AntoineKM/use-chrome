import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/hooks/*.ts",
    "src/hooks/*.tsx",
  ],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["react", "chrome"],
  sourcemap: true,
  treeshake: true,
  splitting: false,
  minify: true,
  outDir: "dist",
  target: "es2020",
  platform: "browser",
});


