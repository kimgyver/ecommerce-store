import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: path.resolve(__dirname, ".") + "/" }]
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    // Only include unit/integration tests under `__tests__` and exclude E2E folder and node_modules
    include: ["**/__tests__/**"],
    exclude: [
      "tests/e2e/**",
      "**/tests/e2e/**",
      "node_modules/**",
      "**/node_modules/**"
    ],
    // NOTE: Vitest 4 moved dep inline config under `server.deps.inline`
    server: {
      deps: {
        inline: ["@exodus/bytes"]
      }
    },
    reporters: process.env.CI
      ? ["default", ["junit", { outputFile: "test-results/junit.xml" }]]
      : ["default"]
  }
});
