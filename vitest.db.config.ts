import path from "node:path";
import { defineConfig } from "vitest/config";

// Testes contra um PostgreSQL real (migrations + RLS). Requer DATABASE_URL_TEST.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
