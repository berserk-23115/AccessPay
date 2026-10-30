import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
export function developmentSecret(file: string): string {
  function read() {
    const value = readFileSync(file, "utf8").trim();
    if (!/^[a-f0-9]{96}$/.test(value))
      throw new Error(
        "The local signing key is invalid. Restore it or set SESSION_SECRET explicitly.",
      );
    return value;
  }
  try {
    return read();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  mkdirSync(dirname(file), { recursive: true });
  const value = randomBytes(48).toString("hex");
  try {
    writeFileSync(file, value, { flag: "wx", mode: 0o600 });
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return read();
    throw error;
  }
}
