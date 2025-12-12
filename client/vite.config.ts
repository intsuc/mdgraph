import { defineConfig } from "vite"
import tsConfigPaths from "vite-tsconfig-paths"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
  ],
  build: {
    outDir: "../server/dist",
  },
})
