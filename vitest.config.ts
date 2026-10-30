import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: {
    alias: Object.fromEntries(
      ["core", "merchant-adapter", "paypal", "ai"].map((name) => [
        `@accesspay/${name}`,
        fileURLToPath(
          new URL(`./packages/${name}/src/index.ts`, import.meta.url),
        ),
      ]),
    ),
  },
  test: { include: ["tests/**/*.test.ts"], testTimeout: 20000 },
});
