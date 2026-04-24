import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ─────────────────────────────────────────────
// NextAuth adapter tables (required for Drizzle adapter)
// ─────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),

  // TrueHire-specific
  githubId: integer("github_id").unique(),
  githubUsername: text("github_username").unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  lastScoredAt: integer("last_scored_at", { mode: "timestamp_ms" }),
  lastIngestedAt: integer("last_ingested_at", { mode: "timestamp_ms" }),
  ingestStatus: text("ingest_status", {
    enum: ["idle", "queued", "running", "failed"],
  })
    .notNull()
    .default("idle"),

  // True once an OAuth sign-in has linked this row to a real session.
  // Seed-created anchor profiles start unclaimed: profile renders publicly
  // but the dashboard / refresh endpoints reject until the owner claims.
  claimed: integer("claimed", { mode: "boolean" }).notNull().default(false),
  seeded: integer("seeded", { mode: "boolean" }).notNull().default(false),
});

// ─────────────────────────────────────────────
// Signal 2 — Employer verification (scaffold, not yet wired to email flow)
// ─────────────────────────────────────────────

export const workHistory = sqliteTable("work_history", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  companyDomain: text("company_domain"),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(), // YYYY-MM
  endDate: text("end_date"), // null = current
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const employerVerifications = sqliteTable("employer_verifications", {
  id: text("id").primaryKey(),
  workHistoryId: text("work_history_id")
    .notNull()
    .references(() => workHistory.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["pending", "confirmed", "denied", "disputed", "expired"],
  })
    .notNull()
    .default("pending"),
  verifierEmail: text("verifier_email").notNull(),
  verifierDomain: text("verifier_domain").notNull(),
  method: text("method", {
    enum: ["email_hr", "email_manager", "payroll_plaid", "peer"],
  })
    .notNull()
    .default("email_hr"),
  tokenHash: text("token_hash").notNull(), // HMAC of verify token; raw token sent via email
  signature: text("signature"), // cryptographic proof once confirmed
  requestedAt: integer("requested_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  notes: text("notes"),
});

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => ({
    pk: primaryKey({ columns: [a.provider, a.providerAccountId] }),
  }),
);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => ({
    pk: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// ─────────────────────────────────────────────
// TrueHire domain tables
// ─────────────────────────────────────────────

/**
 * Raw GitHub contribution rollup per (user, repo).
 * Refreshed on ingest. One row per distinct repo touched.
 */
export const contributions = sqliteTable(
  "contributions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    repoFullName: text("repo_full_name").notNull(),
    repoStars: integer("repo_stars").notNull().default(0),
    repoUrl: text("repo_url").notNull(),
    repoDescription: text("repo_description"),
    primaryLanguage: text("primary_language"),
    firstCommitAt: integer("first_commit_at", { mode: "timestamp_ms" }),
    lastCommitAt: integer("last_commit_at", { mode: "timestamp_ms" }),
    commits: integer("commits").notNull().default(0),
    additions: integer("additions").notNull().default(0),
    deletions: integer("deletions").notNull().default(0),
    mergedPrs: integer("merged_prs").notNull().default(0),
    isAuthor: integer("is_author", { mode: "boolean" }).notNull().default(false),
    isFork: integer("is_fork", { mode: "boolean" }).notNull().default(false),
    pushedAt: integer("pushed_at", { mode: "timestamp_ms" }),
    // JSON-encoded CraftSignals for authored repos, null for external/unscanned
    craftJson: text("craft_json"),
    // weighted contribution value used in Recognition score
    weightedScore: real("weighted_score").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.repoFullName] }),
  }),
);

/**
 * Monthly activity bucket — used to compute Depth (months active) and
 * power the timeline chart without scanning every commit.
 */
export const activityMonths = sqliteTable(
  "activity_months",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // YYYY-MM bucket
    month: text("month").notNull(),
    commits: integer("commits").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.month] }),
  }),
);

/**
 * Versioned score snapshot. Weekly recompute inserts a new row; current
 * score is the latest by computed_at.
 */
export const scores = sqliteTable(
  "scores",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    computedAt: integer("computed_at", { mode: "timestamp_ms" }).notNull(),
    overall: integer("overall").notNull(),
    // signal1 = weighted composite of Depth/Breadth/Recognition/Craft/Spec (0-100).
    //           overall = signal1 + bonus(signal2). Kept separately so we can
    //           display each signal's own score cleanly.
    signal1: integer("signal1").notNull().default(0),
    // signal2 = employer verification (0-100), bonus applied to overall.
    signal2: integer("signal2").notNull().default(0),
    depth: integer("depth").notNull(),
    breadth: integer("breadth").notNull(),
    recognition: integer("recognition").notNull(),
    craft: integer("craft").notNull().default(0),
    specialization: integer("specialization").notNull(),
    // JSON payloads — kept as text for portability
    languagesJson: text("languages_json").notNull().default("[]"),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    totalCommits: integer("total_commits").notNull().default(0),
    totalStars: integer("total_stars").notNull().default(0),
    totalRepos: integer("total_repos").notNull().default(0),
    monthsActive: integer("months_active").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.computedAt] }),
    // for fast "latest score" lookup
    userIdx: uniqueIndex("scores_user_computed_idx").on(t.userId, t.computedAt),
  }),
);

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type WorkHistory = typeof workHistory.$inferSelect;
export type EmployerVerification = typeof employerVerifications.$inferSelect;
export type Contribution = typeof contributions.$inferSelect;
export type Score = typeof scores.$inferSelect;
export type ActivityMonth = typeof activityMonths.$inferSelect;
