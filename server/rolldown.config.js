import { defineConfig } from "rolldown"

export default defineConfig({
  input: "main.ts",
  platform: "node",
  tsconfig: true,
  output: {
    file: "dist/bundle.js",
    banner: "#!/usr/bin/env node",
    minify: true,
  },
  external: /node_modules/,
})
