import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  build: {
    target: "es2020",
    // keep the bundle lean; the WebGL field is hand-rolled, no runtime deps
    chunkSizeWarningLimit: 120,
  },
});
