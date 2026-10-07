<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ZTrackIQ agent guide

## Project overview

ZTrackIQ is a French-language Mini-Z race-control application. It manages pilots, clubs, cars and their upgrades, race sessions and results, solo/team championships, rankings, profiles, and an audit trail.

The application is a single Next.js App Router project. There is no separate API or service layer: Server Components read through Prisma, and Server Actions perform mutations.

## Stack and commands

- Next.js 16.2, React 19, TypeScript in strict mode.
- PostgreSQL through Prisma 6. The schema is split across the `prisma/` directory.
- Tailwind CSS 4, shadcn/Base UI primitives, Heroicons and Lucide.
- Zustand mirrors the authenticated user into client state; it is not an authorization source.
- Vitest covers pure helpers.
- npm is the package manager; keep `package-lock.json` in sync.

Use these commands from the repository root:

```bash
npm run dev       # Next dev server using webpack
npm test          # Vitest, one run
npm run test:watch
npm run lint      # ESLint
npm run build     # Prisma generate, then production Next build
```

Run focused tests while iterating, then run `npm test` and `npm run lint`. Run `npm run build` for changes affecting Next.js boundaries, Prisma-generated types, configuration, or deployment. A build requires the expected environment and database configuration.

## Repository map

- `src/app/`: App Router pages, route-local Client Components, and Server Actions.
- `src/components/`: shared UI components; `src/components/ui/` contains UI primitives.
- `src/lib/`: authentication, JWT, Prisma client, audit, racing, display, and password helpers.
- `src/stores/`: client-only Zustand state.
- `src/types/`: shared serializable TypeScript types.
- `prisma/schema.prisma`: generator and datasource configuration.
- `prisma/*.prisma`: domain models and enums.
- `prisma/migrations/`: committed PostgreSQL migrations; never edit an applied migration.
- `public/images/`: branded imagery used by the UI.
- `src/lib/*.test.ts`: colocated Vitest tests.

## Next.js and React rules

- Consult the matching guide under `node_modules/next/dist/docs/01-app/` before changing framework behavior. Do not rely on remembered APIs from an older Next.js version.
- Pages and layouts are Server Components by default. Keep Prisma, secrets, auth checks, and heavy data shaping on the server.
- Add `"use client"` only at the smallest boundary that needs hooks, state, event handlers, drag-and-drop, or browser APIs. Props crossing that boundary must be serializable.
- In this Next.js version, request APIs are asynchronous. Await `cookies()`, and type page `searchParams`/`params` as promises before awaiting them, following the local docs and existing pages.
- Put form mutations in a `"use server"` action module near the route. Validate and normalize every `FormData` field on the server; browser validation is only a convenience.
- After a mutation, revalidate every affected route before redirecting. Remember that cars, pilots, races, championships, the dashboard, and `/me` can display overlapping data.
- Preserve the `@/* -> src/*` import alias. Prefer it for cross-directory imports and relative imports for tightly colocated files.

## Authentication and authorization

- The source of truth is the HTTP-only JWT cookie handled in `src/lib/auth.ts`, `src/lib/jwt.ts`, and the login/logout actions.
- Use `requireCurrentUser()` for authenticated reads or self-service actions and `requireAdmin()` for administrative writes.
- Every Server Action must perform its own authorization check, even if its form is only rendered to authorized users.
- For self-service mutations, scope database lookups by `user.id`; never trust a pilot or owner ID supplied by the client.
- Treat Zustand's `useUserStore` as display state only. Client-side role checks must never protect data or mutations.
- Never return, log, or expose JWT secrets or password hashes. Do not include password hashes in new audit payloads.
- Production requires `JWT_SECRET` (or `AUTH_SECRET`). `DATABASE_URL` and `DIRECT_URL` are required by Prisma.

## Persistence and domain invariants

- Import the singleton `prisma` client from `@/lib/prisma`; do not instantiate a client per request.
- Wrap related writes and their audit entry in one `prisma.$transaction`. Pass the transaction client to `auditLog` where applicable.
- Record CREATE, UPDATE, DELETE, or DISABLE changes in `AuditLog`, with useful before/after snapshots and actor information when available.
- Schema changes require a new migration and regenerated Prisma client. Review both the Prisma diff and generated SQL; preserve existing data and constraints.
- Race mode and championship mode must agree (`solo` or `team`). A race can only be assigned to a championship whose date range contains the race date.
- Solo results identify a pilot; team results identify a `RaceTeam`. Positions are unique within a race, as are pilot/team results.
- `Race.sessionOrder` defines ordering among races on the same session date. Preserve or recompute it when moving or deleting races.
- Lap times are stored as integer milliseconds. Reuse helpers in `src/lib/racing.ts` for parsing and display.
- A car's displayed PI is derived from selected specs (`CarSpec`/`Spec.piValue`). Current write paths set legacy `basePi` to zero.
- Deletions have meaningful cascades and `SetNull` behavior. Inspect relations before changing a delete flow.

## UI and product conventions

- User-facing copy is French. Keep terminology consistent: pilote, voiture, course/session, circuit, championnat, amélioration, équipe.
- The product is dark, dense, and motorsport-oriented. Reuse tokens from `src/lib/theme.ts` and existing Tailwind patterns instead of introducing an unrelated visual system.
- Keep pages responsive. Existing large tables use dedicated Client Components for interaction and mobile-aware layouts.
- Reuse `getPilotDisplayName` and related helpers when displaying pilots so nicknames and duplicate first names stay consistent.
- Prefer accessible native elements, explicit labels, keyboard-safe controls, and descriptive `aria-label` values for icon-only buttons.

## Change workflow

1. Inspect the route, its action module, related Prisma models, and affected tests before editing.
2. Read the relevant local Next.js 16 documentation before touching framework APIs or conventions.
3. Make the smallest coherent change and preserve unrelated working-tree edits.
4. For mutations, verify validation, authorization, ownership, transactionality, auditing, and cache revalidation.
5. Add or update Vitest coverage for pure business logic and regression-prone parsing/calculation behavior.
6. Run the checks appropriate to the change and report any check that could not run, including the reason.

## Known technical risks

- Passwords currently use a legacy unsalted SHA-256 format and new account-capable pilots receive a shared default hash. Do not extend this scheme; treat authentication changes as a security migration that preserves existing login compatibility.
- Several route pages and action files contain substantial business logic. Prefer extracting tested pure helpers when modifying calculations, validation, or repeated parsing, without performing broad unrelated refactors.
- Database-backed Server Actions and authorization flows have little automated coverage. Test them carefully when changing access control or transactions.
- `README.md` is still the generic create-next-app document; do not treat it as an authoritative description of this application.
