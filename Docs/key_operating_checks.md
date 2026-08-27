# Key operating checks

This document records local-development constraints that are easy to miss when
running the main and UI worktrees side by side.

## UI worktree

- Worktree: `/Users/uzair/Projects/newinvoice-gpt-ui`
- Branch: `codex/project-first-ui`
- Local URL: `http://localhost:3102`
- Database: the disposable `newinvoice_test` database only
- Do not point this process at the development or production database.

### Start the UI worktree safely

Run this from the UI worktree. It imports the existing local OAuth configuration,
then explicitly replaces the application URL and database URL for this process:

```sh
set -a
source /Users/uzair/Projects/newinvoice/.env.local
set +a
DATABASE_URL='postgresql://newinvoice:newinvoice@localhost:5432/newinvoice_test?schema=public' \
NEXT_PUBLIC_APP_URL='http://localhost:3102' \
AUTH_URL='http://localhost:3102' \
SETTINGS_ENCRYPTION_KEY='codex-ui-test-only' \
pnpm dev --port 3102
```

The username, password, host, and schema in that URL are the repository's
documented local Docker defaults. If local database credentials change, derive
the test URL from `TEST_DATABASE_URL` or update it to match the local Postgres
service while keeping the database name `newinvoice_test`.

### Google OAuth check

The Google OAuth client must include this exact authorized redirect URI:

```text
http://localhost:3102/api/auth/callback/google
```

Changing the port requires a separate redirect URI entry in Google Cloud.

### Post-start verification

1. Open `http://localhost:3102/projects`.
2. Confirm the signed-in Projects page loads rather than `/login`.
3. Check the server log for Prisma or Auth.js errors.
4. Confirm project paging keeps card positions stable between the first and
   final pages.

## Known failure: `/login?error=Configuration`

On 2026-08-27, the UI server was restarted with
`postgresql://localhost:5432/newinvoice_test`, which omitted the repository's
local database credentials. Google completed its callback, but the Auth.js
Prisma adapter could not read sessions or accounts and redirected to:

```text
/login?error=Configuration
```

The decisive server-log message was:

```text
PrismaClientInitializationError: User was denied access on the database
```

Correction: restart the UI server using the complete test URL in the safe
launch command above. Do not respond by switching to the development database.

