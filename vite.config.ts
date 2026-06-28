import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-vite-plugin"
import path from "path"

export default defineConfig({
  plugins: [tailwindcss(), react(), TanStackRouterVite({ routesDirectory: "./routes", generatedRouteTree: "./routeTree.gen.ts" }), viteSingleFile()],
  root: "src/renderer",
  base: "./",
  resolve: {
    alias: { "@": path.resolve(__dirname, "src/renderer") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})
