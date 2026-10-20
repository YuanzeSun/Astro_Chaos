import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: { target: "es2022" },
  server: {
    host: "127.0.0.1",
    port: 5178,
    // /auth/callback: where Sign in with ChatGPT comes back to (registered as 127.0.0.1:8765).
    proxy: { "/api": "http://127.0.0.1:8765", "/auth": "http://127.0.0.1:8765" },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
