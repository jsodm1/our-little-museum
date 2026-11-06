import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === "true" ? "/our-little-museum/" : "./",
  build: { chunkSizeWarningLimit: 700 },
});
