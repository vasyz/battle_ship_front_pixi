import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: ".",
  server: {
    port: 5173
  },
  build: {
    outDir: path.resolve(__dirname, "../server/public"),
    emptyOutDir: true
  }
});
