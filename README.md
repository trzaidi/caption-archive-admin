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

## Week 7: pipeline and observability

Apply `sql/004_week7_observability.sql` once in the Supabase SQL editor. Until it is applied, the new pages say so instead of failing.

| Requirement | Page | Access |
| --- | --- | --- |
| Users | `/users` | Read |
| Prompt chains | `/prompt-chains` | Read |
| Prompt chain steps | `/prompt-chain-steps` | Read |
| Prompt chain mix | `/prompt-chain-mix` | Read and update, with target vs observed share |
| Terms | `/terms` | Create, read, update, delete |
| AI generated media | `/media` | Read and view pictures (plus full caption CRUD) |
| Generation requests | `/generation-requests` | Read, with the logged outcome |
| AI generation examples | `/caption-examples` | Create, read, update, delete |
| LLM models | `/llm-models` | Create, read, update, delete |
| LLM providers | `/llm-providers` | Create, read, update, delete |
| LLM responses | `/llm-responses` | Read, with status, tokens and latency |
| Allowed signup domains | `/signup-domains` | Create, read, update, delete |
| Whitelisted email addresses | `/whitelisted-emails` | Create, read, update, delete |

| Images (profile photos) | `/profile-photos` | Upload, view, replace, delete |

Members upload profile photos in the rating app, so the conditional image requirement applies to those photos. Apply `sql/005_admin_profile_photos.sql` after 004. It lets superadmins manage the `avatars` storage bucket and the photo on any profile, and audits each change. Admin uploads are capped at 4 MB because Vercel rejects larger request bodies. Caption pictures remain the fixed gallery bundled with the rating app.

The migration seeds the pipeline the rating app actually runs: one chain per tone with three steps, the Gemini model behind each provider, a Columbia glossary, 15 curated example captions and two signup domains. It backfills the response log from captions already generated. Every change made in the panel is written to the audit trail in the same transaction. Chains and steps are versioned through migrations, so the panel reads them only.

The rating app (`design-gen-ai`) logs each model call to `llm_responses`, including rejections and provider errors. Logging failures never block a member's generation. Signup domains and whitelisted emails are recorded for review; sign-in is not yet restricted by them.

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

`sql/004_week7_observability.sql` was dry-run against PGlite with stand-ins for the existing tables: administrator CRUD and audit rows, read-only chains and steps, weight-only mix updates, blocked member reads and writes, and member response logging only for their own requests.

`sql/security-tests.sql` runs role-specific integration assertions and rolls all mutations back. It passed against the shared database on October 25, 2026: member isolation, blocked role insert/update, compatible member and owner profile upserts, administrator media CRUD, vote aggregation, cascading cleanup, atomic audit events and anonymous restrictions. No real content was changed by the test.

## Week 6 feedback and Week 7 iteration

| Source | Feedback |
| --- | --- |
| PM | The work is great and he is not worried about the submissions. No specific changes requested (as of November 1, 2026). |
| Project owner | Admins must be able to upload profile photos. Uploads that hit a limit must say why. |

No specific PM change is claimed. This iteration combines the owner's requests with a self-audit of the Week 6 admin panel.

| Problem found | Change |
| --- | --- |
| Admins could not upload, replace or remove a member's profile photo. | New Profile photos page backed by the avatars storage bucket, with preview, replace and confirmed removal. |
| Rejected uploads gave no reason. | Type and size are checked when a file is chosen and again on the server. The message states the file's size, the 4 MB limit and that the hosting provider imposes it. |
| The rating app silently failed on any profile photo over 1 MB. | Server action body limit raised to 4.4 MB, under Vercel's 4.5 MB cap, with the same explanatory errors. |
| The Users directory did not show profile photos. | Photo thumbnails beside each member. |
| The audit trail covered caption edits only. | Every create, update and delete in the new sections, and every admin photo change, is audited in the same transaction. |
| There was no visibility into AI generation. | The rating app logs each model call. Generation requests, LLM responses and an Overview pipeline-health panel show status, tokens and latency. |
| The generation pipeline was hard-coded and invisible. | Prompt chains, steps, mix, terms, examples, providers and models are browsable, with target vs observed chain mix. |
| A single flat sidebar would not scale to 16 sections. | Navigation grouped into Workspace, Pipeline, Models, Observability and Access. |

## Week 5 feedback

The rating app's `docs/pm-feedback.md` records the PM/group feedback as “It's great” with no specific changes requested. Its deployed iteration includes inline voting, Judge mode, sharing, leaderboard, improved generation controls and Columbia campus content. These are documented self-audit and owner-requested improvements rather than invented PM requests.

## Data scope

Dashboard rankings and publishing trends use the latest 200 captions. Profile directory and vote ledger display up to 500 records; score aggregates display up to 10,000 records. These bounds are sufficient for the current class project and are labeled where relevant. Media inventory pages contain 25 records.
