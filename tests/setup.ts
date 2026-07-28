import { config } from "dotenv";
import { resolveTestDatabaseUrl } from "./testDatabaseUrl";

config({ path: ".env.local" });

// Tests never run against the development database: force DATABASE_URL (what
// src/lib/prisma.ts's client reads) to the dedicated test database, after
// loading .env.local so SETTINGS_ENCRYPTION_KEY etc. still come through.
// `scripts/prepareTestDb.ts` (the pretest hook) creates/migrates it.
process.env.DATABASE_URL = resolveTestDatabaseUrl();
