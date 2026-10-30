import { createRepository } from "../db/repository";
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Set DATABASE_URL before migrating the hosted ledger. Local development migrates automatically.",
    );
  const repo = await createRepository({ url: process.env.DATABASE_URL });
  await repo.close();
  console.log("AccessPay database migration applied.");
}
main().catch(() => {
  console.error(
    "Database migration failed. Check DATABASE_URL and database access. No credentials were logged.",
  );
  process.exitCode = 1;
});
