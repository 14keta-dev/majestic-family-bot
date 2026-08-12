import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/**/*.ts"],
    format: ["cjs"],
    target: "node20",
    bundle: false,
    splitting: false,
    clean: true,
    outDir: "dist",
});