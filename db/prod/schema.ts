// Read/write schema for the Zyber production Postgres database (PROD_DATABASE_URL).
// These tables are owned and migrated by the Zyber Go service — do NOT run
// drizzle-kit against this schema. Only the columns the dashboard reads or
// writes are declared here; everything else is intentionally omitted.

import {
  pgTable,
  text,
  boolean,
  timestamp,
  bigint,
  smallint,
  integer,
  date,
  jsonb,
} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  username: text("username").primaryKey(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  headline: text("headline").notNull(),
  phoneNumber: text("phone_number").notNull(),
  phoneVerified: boolean("phone_verified").notNull(),
  role: text("role").notNull(),
  isActive: boolean("is_active").notNull(),
  isBanned: boolean("is_banned").notNull(),
  avatarUrl: text("avatar_url"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  bio: text("bio").notNull(),
  linkedinUrl: text("linkedin_url").notNull(),
  isOnboardingComplete: boolean("is_onboarding_complete").notNull(),
  instagramHandle: text("instagram_handle").notNull(),
  twitterHandle: text("twitter_handle").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  college: text("college").notNull(),
  collegeCourse: text("college_course").notNull(),
  graduationYear: integer("graduation_year"),
  workEmail: text("work_email").notNull(),
  workEmailVerified: boolean("work_email_verified").notNull(),
  accountState: text("account_state").notNull(),
})

export const communities = pgTable("communities", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  isPrivate: boolean("is_private").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  requiresApproval: boolean("requires_approval").notNull(),
  inviteToken: text("invite_token").notNull(),
  adminOnlyPosts: boolean("admin_only_posts").notNull(),
})

export const communityMembers = pgTable("community_members", {
  communityId: bigint("community_id", { mode: "number" }).notNull(),
  username: text("username").notNull(),
})

export const communityEvents = pgTable("community_events", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  communityId: bigint("community_id", { mode: "number" }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
})

export const eventAttendees = pgTable("event_attendees", {
  eventId: bigint("event_id", { mode: "number" }).notNull(),
  userId: text("user_id").notNull(),
  status: text("status").notNull(),
})

export const userReports = pgTable("user_reports", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  reporterUsername: text("reporter_username").notNull(),
  reportedUsername: text("reported_username").notNull(),
  reason: text("reason").notNull(),
  notes: text("notes").notNull(),
  status: text("status").notNull(),
  adminNotes: text("admin_notes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
})

export const accountDeletionRequests = pgTable("account_deletion_requests", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  username: text("username").notNull(),
  requestType: text("request_type").notNull(),
  breakDurationDays: integer("break_duration_days"),
  status: text("status").notNull(),
  adminNotes: text("admin_notes").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
})

export const workEmailReviewRequests = pgTable("work_email_review_requests", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  username: text("username").notNull(),
  workEmail: text("work_email").notNull(),
  domain: text("domain").notNull(),
  status: text("status").notNull(),
  reviewedBy: text("reviewed_by").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  reviewNote: text("review_note").notNull(),
})

export const allowedWorkEmailDomains = pgTable("allowed_work_email_domains", {
  domain: text("domain").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
})

export const maintainers = pgTable("maintainers", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  isActive: boolean("is_active").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
})

export const maintainerColleges = pgTable("maintainer_colleges", {
  maintainerId: bigint("maintainer_id", { mode: "number" }).notNull(),
  college: text("college").notNull(),
})

export const appVersionConfig = pgTable("app_version_config", {
  id: smallint("id").primaryKey(),
  latestVersion: text("latest_version").notNull(),
  minSupportedVersion: text("min_supported_version").notNull(),
  forceUpdate: boolean("force_update").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  maintenanceMode: boolean("maintenance_mode").notNull(),
  iosUpdateUrl: text("ios_update_url").notNull(),
  androidUpdateUrl: text("android_update_url").notNull(),
  featureFlags: jsonb("feature_flags").notNull(),
  workEmailOpen: boolean("work_email_open").notNull(),
})

export const userReferralSources = pgTable("user_referral_sources", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  username: text("username").notNull(),
  source: text("source").notNull(),
  refereeUsername: text("referee_username").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
})

export const dailyCallStats = pgTable("daily_call_stats", {
  date: date("date").primaryKey(),
  totalSeconds: bigint("total_seconds", { mode: "number" }).notNull(),
})

export const requests = pgTable("requests", {
  user1: text("user1").notNull(),
  user2: text("user2").notNull(),
  intent1: boolean("intent1").notNull(),
  intent2: boolean("intent2").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
})

export const analyticsEvents = pgTable("analytics_events", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  sessionId: text("session_id").notNull(),
  serverTs: timestamp("server_ts", { withTimezone: true }).notNull(),
})
