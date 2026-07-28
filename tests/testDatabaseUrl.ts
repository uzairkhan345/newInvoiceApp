/**
 * Single source of truth for which database the test suite runs against.
 *
 * Integration tests create and delete real rows, so they must never run
 * against the development database in `.env.local`'s DATABASE_URL. Instead
 * they use TEST_DATABASE_URL, defaulting to a `newinvoice_test` database on
 * the same docker-compose Postgres server — created and migrated
 * automatically by `scripts/prepareTestDb.ts` (the `pretest` hook).
 */
export const DEFAULT_TEST_DATABASE_URL =
  "postgresql://newinvoice:newinvoice@localhost:5432/newinvoice_test?schema=public";

export function resolveTestDatabaseUrl(): string {
  const testUrl = process.env.TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL;
  if (process.env.DATABASE_URL && testUrl === process.env.DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL must not be the same as DATABASE_URL — integration " +
        "tests create and delete rows and must run against a dedicated, " +
        "disposable test database.",
    );
  }
  return testUrl;
}
