# Caption Archive Admin

Separate Next.js admin application for the Caption Archive rating app. Google sign-in and the current database `profiles.is_superadmin` flag are checked in the request proxy, protected pages, server actions, and database row policies.

## Features

- Dashboard: profile and caption totals, community votes, approval rate, rankings, creative mix, publishing activity and audit trail.
- Read-only profile directory with account emails and search by name, email or ID.
- Create, read, update and delete AI-generated caption records, including scene, prompt, model, tone and existing image path. Generation is available through the linked rating app.
- Search and pagination for the media inventory.
- Read-only aggregate scores and an individual vote ledger showing voter, caption, vote and time.
- Inline form errors, pending states, delete confirmation, responsive navigation and accessible controls.
- Transactional database audit log for administrator media changes, showing which administrator made each change.

## Existing project

The GitHub repository and Vercel project are both named `caption-archive-admin`. Use the existing Supabase project shared with `trzaidi/design-gen-ai`; do not create another database.

Required environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Only a public/publishable key is used. Never add a service-role key to this application.

The database setup in `sql/001_admin_security.sql` and `sql/002_role_guard_and_atomic_audit.sql` has already been applied. The first file is historical reference and must not be rerun against existing policies. The second adds role guards, compatible profile upserts, media privileges and transactional audit logging. `sql/003_admin_directory.sql` adds an administrator-only function that returns account emails for the directory, audit trail and vote ledger; until it is applied those views fall back to names. SQL administrator access is required to change administrator assignments; the app cannot grant roles.

For a new installation, identify the intended Google account in `auth.users` and set only its matching profile's `is_superadmin` to `true` using the Supabase SQL editor. This privileged bootstrap solves the initial administrator lockout.

Allow the deployed admin `/auth/callback` address in Supabase Auth redirect URLs. Disable Vercel deployment protection while keeping the application's Google login and administrator restrictions enabled.

## Validation

```
npm ci
npm run build
npm run typecheck
```

`sql/security-tests.sql` runs role-specific integration assertions and rolls all mutations back. It passed against the shared database on October 25, 2026: member isolation, blocked role insert/update, compatible member and owner profile upserts, administrator media CRUD, vote aggregation, cascading cleanup, atomic audit events and anonymous restrictions. No real content was changed by the test.

## Week 5 feedback

The rating app's `docs/pm-feedback.md` records the PM/group feedback as “It's great” with no specific changes requested. Its deployed iteration includes inline voting, Judge mode, sharing, leaderboard, improved generation controls and Columbia campus content. These are documented self-audit and owner-requested improvements rather than invented PM requests.

## Data scope

Dashboard rankings and publishing trends use the latest 200 captions. Profile directory and vote ledger display up to 500 records; score aggregates display up to 10,000 records. These bounds are sufficient for the current class project and are labeled where relevant. Media inventory pages contain 25 records.
