-- Run this against the **zyber** database BEFORE switching DATABASE_URL.
-- Creates the dashboard auth tables that currently live in zyber-dashboard.
-- All CREATE statements are idempotent (IF NOT EXISTS / duplicate_object guard).

-- ── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE admin_user_role AS ENUM ('admin', 'marketing', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── user ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user" (
  id            TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  email_verified BOOLEAN    NOT NULL DEFAULT false,
  image         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role          admin_user_role NOT NULL DEFAULT 'user'
);

-- ── session ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session (
  id          TEXT        PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  token       TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address  TEXT,
  user_agent  TEXT,
  user_id     TEXT        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_userId_idx ON session(user_id);

-- ── account ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account (
  id                       TEXT        PRIMARY KEY,
  account_id               TEXT        NOT NULL,
  provider_id              TEXT        NOT NULL,
  user_id                  TEXT        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token             TEXT,
  refresh_token            TEXT,
  id_token                 TEXT,
  access_token_expires_at  TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope                    TEXT,
  password                 TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS account_userId_idx ON account(user_id);

-- ── verification ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification (
  id          TEXT        PRIMARY KEY,
  identifier  TEXT        NOT NULL,
  value       TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);

-- ── invitation ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitation (
  id          TEXT              PRIMARY KEY,
  email       TEXT              NOT NULL,
  role        admin_user_role   NOT NULL DEFAULT 'user',
  status      invitation_status NOT NULL DEFAULT 'pending',
  invited_by  TEXT              REFERENCES "user"(id) ON DELETE SET NULL,
  accepted_by TEXT              REFERENCES "user"(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ       NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS invitation_email_idx   ON invitation(email);
CREATE INDEX IF NOT EXISTS invitation_status_idx  ON invitation(status);
