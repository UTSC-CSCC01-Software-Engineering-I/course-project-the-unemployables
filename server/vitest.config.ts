import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Load the same root .env the server uses at startup, so modules that build
    // a Supabase client at import time have real credentials during tests.
    setupFiles: ["./src/loadEnv.ts"],
  },
});
