# Zyber Admin Dashboard

Internal Next.js admin dashboard for managing and monitoring the Zyber platform.

## Tech stack

| Package | Version |
|---|---|
| Next.js | 16.2.6 |
| React | ^19.2.4 |
| shadcn/ui | ^4.7.0 |
| Drizzle ORM | ^0.45.1 |
| Better Auth | ^1.6.9 |
| TanStack Query | ^5.100.9 |
| TanStack Table | ^8.21.3 |
| Recharts | 3.8.0 |
| Tailwind CSS | ^4.2.1 |
| TypeScript | ^5.9.3 |

## Running locally

```bash
npm install
npm run dev
```

The dashboard runs at `http://localhost:3000` by default (Turbopack enabled).

Other useful scripts:

```bash
npm run build        # production build
npm run typecheck    # TypeScript check, no emit
npm run lint         # ESLint
npm run format       # Prettier

npm run migrate              # run dashboard DB migrations
npm run studio:dashboard     # Drizzle Studio for the dashboard DB
npm run studio:prod          # Drizzle Studio for the production Zyber DB
```

## Environment variables

Copy `.env.example` to `.env` and fill in all values before running.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string for the dashboard database (auth tables + dashboard schema). |
| `BETTER_AUTH_SECRET` | Yes | Secret used to sign Better Auth sessions. Generate with `openssl rand -hex 32`. |
| `BETTER_AUTH_URL` | Yes | Full public URL of this dashboard (e.g. `http://localhost:3000`). No trailing slash. |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID for invitation-based sign-up. |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret. |
| `ZYBER_API_URL` | Yes | Base URL of the Go backend (e.g. `http://localhost:8080`). No trailing slash. |
| `ZYBER_ADMIN_USERNAME` | Yes | Super-admin username for privileged Zyber API calls. |
| `ZYBER_ADMIN_PASSWORD` | Yes | Super-admin password for privileged Zyber API calls. |
| `JWT_SECRET_ADMIN` | Yes | Must match `JWT_SECRET_ADMIN` in the Go backend — used to verify maintainer sessions. |
| `EMAIL_USER` | Yes | Gmail address for sending dashboard invitation emails. |
| `EMAIL_PASS` | Yes | Gmail app password for `EMAIL_USER`. |
| `SMTP_HOST` | No | SMTP host (default: `smtp.gmail.com`). |
| `SMTP_PORT` | No | SMTP port (default: `587`). |
| `SMTP_SECURE` | No | Set `true` for port 465 / implicit TLS (default: `false`). |
| `SMTP_USERNAME` | No | Alias for `EMAIL_USER` when that var is empty. |
| `SMTP_PASSWORD` | No | Alias for `EMAIL_PASS` when that var is empty. |
| `SMTP_FROM_EMAIL` | No | Sender address shown in outbound emails. |
| `SMTP_FROM_NAME` | No | Sender name shown in outbound emails. |
| `REDIS_ADDR` | No | Redis address `host:port` (default: `localhost:6379`). |
| `REDIS_PASSWORD` | No | Redis AUTH string (empty for local dev). |
| `REDIS_TLS` | No | Set `true` for Memorystore with in-transit TLS. |
| `REDIS_CA_CERT` | No | Path to Memorystore CA PEM for full cert verification. |
| `GA4_PROPERTY_ID` | No | Numeric GA4 property ID for Firebase Analytics charts. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | No | Single-line JSON of the Google service account granted Viewer access to the GA4 property. |

## Navigation sections

| Section | Path | Access |
|---|---|---|
| **Analytics** | | |
| Platform Overview | `/analytics/overview` | admin, marketing |
| Funnel | `/analytics/funnel` | admin, marketing |
| Match Intelligence | `/analytics/match-intelligence` | admin, marketing |
| User Cohorts | `/analytics/user-cohorts` | admin, marketing |
| **Overview** | | |
| Telemetry | `/` | admin, marketing |
| Live users | `/live` | admin |
| **Moderation** | | |
| Users | `/users` | admin, maintainer |
| Reports | `/reports` | admin, maintainer |
| Deletion requests | `/deletion-requests` | admin |
| Work email | `/work-email` | admin, maintainer |
| **Content** | | |
| Communities | `/communities` | admin, maintainer |
| Events | `/events` | admin, maintainer |
| **Engagement** | | |
| Announcements | `/announcements` | admin |
| Push Notifications | `/notifications` | admin |
| **Operations** | | |
| Logs | `/logs` | admin |
| Maintainers | `/maintainers` | admin |
| Support Staff | `/support-staff` | admin |
| Version | `/version` | admin |
| **Admin** | | |
| Invitations | `/invitations` | admin |
| SQL Explorer | `/sql-explorer` | admin |

Roles: `admin` has full access. `marketing` sees only analytics and telemetry. `maintainer` (a separate role managed by the Go backend) sees users, reports, communities, events, and work email. `user` has no dashboard access.

## Database access pattern

- **`db/drizzle.ts`** — Creates a pooled `postgres-js` client from `DATABASE_URL` and exports `db` (a Drizzle instance without a schema binding). Used for dashboard-owned tables (Better Auth sessions, invitations, etc.) and for `dbProd` below. The client is persisted on `globalThis` to survive hot-reloads.
- **`db/prod/drizzle.ts`** — Exports `dbProd`, a Drizzle instance that reuses the same client but is bound to the production Zyber schema. Use this when reading or writing production app data.
- **`db/prod/schema.ts`** — Drizzle table definitions that mirror the production Zyber Postgres schema. This is the single source of truth for query types against the production database from within the dashboard.

## Adding a new section

1. **Add a `DashboardSection` key** in `lib/permissions.ts` and include it in the appropriate role arrays (`ALL_ADMIN`, `MAINTAINER_SECTIONS`, or the `ACCESS` map for `marketing`).
2. **Add a `NavItem`** to the relevant `NavGroup` in `lib/nav.ts`, pointing to the new `href`.
3. **Create the route** under `app/` (e.g. `app/your-section/page.tsx`). Wrap the page content with the existing auth/permission middleware — see any existing section page for the pattern.
4. **Add any required DB queries** in the route's server component or a dedicated `actions.ts` file, using `db` (dashboard tables) or `dbProd` (production tables) as appropriate.
