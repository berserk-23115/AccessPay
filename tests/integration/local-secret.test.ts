import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { developmentSecret } from "../../apps/web/lib/development-secret";
import { signIdentity, verifyIdentity } from "../../apps/web/lib/security";
describe("local restart identity persistence", () => {
  it("keeps the same signer across independent loads so saved-device cookies survive a restart", () => {
    const directory = mkdtempSync(join(tmpdir(), "accesspay-secret-test-"));
    try {
      const file = join(directory, "private", "signer");
      const first = developmentSecret(file),
        token = signIdentity(
          { userId: "demo-shopper", deviceId: "desktop" },
          first,
        );
      const restarted = developmentSecret(file);
      expect(restarted).toBe(first);
      expect(verifyIdentity(token, restarted)).toMatchObject({
        deviceId: "desktop",
      });
      expect(readFileSync(file, "utf8").trim().length).toBeGreaterThanOrEqual(
        32,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("does not silently replace a corrupt signer and strand existing drafts", () => {
    const directory = mkdtempSync(join(tmpdir(), "accesspay-secret-test-"));
    try {
      const file = join(directory, "signer");
      writeFileSync(file, "corrupt");
      expect(() => developmentSecret(file)).toThrow();
      expect(readFileSync(file, "utf8")).toBe("corrupt");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
