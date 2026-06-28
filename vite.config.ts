import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [tailwindcss(), react(), viteSingleFile()],
  root: "src/renderer",
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})
