import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ─────────────────────────────────────────────
// NextAuth adapter tables (required for Drizzle adapter)
// ─────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
  image: text('image'),

  // TrueHire-specific
  githubId: integer('github_id').unique(),
  githubUsername: text('github_username').unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  lastScoredAt: integer('last_scored_at', { mode: 'timestamp_ms' }),
  lastIngestedAt: integer('last_ingested_at', { mode: 'timestamp_ms' }),
  ingestStatus: text('ingest_status', {
    enum: ['idle', 'queued', 'running', 'failed'],
  })
    .notNull()
    .default('idle'),

  // True once an OAuth sign-in has linked this row to a real session.
  // Seed-created anchor profiles start unclaimed: profile renders publicly
  // but the dashboard / refresh endpoints reject until the owner claims.
  claimed: integer('claimed', { mode: 'boolean' }).notNull().default(false),
  seeded: integer('seeded', { mode: 'boolean' }).notNull().default(false),
});

// ─────────────────────────────────────────────
// Signal 2 — Employer verification (scaffold, not yet wired to email flow)
// ─────────────────────────────────────────────

export const workHistory = sqliteTable(
  'work_history',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    company: text('company').notNull(),
    companyDomain: text('company_domain'),
    title: text('title').notNull(),
    startDate: text('start_date').notNull(), // YYYY-MM
    endDate: text('end_date'), // null = current
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    userIdx: index('work_history_user_idx').on(t.userId),
  })
);

export const employerVerifications = sqliteTable(
  'employer_verifications',
  {
    id: text('id').primaryKey(),
    workHistoryId: text('work_history_id')
      .notNull()
      .references(() => workHistory.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['pending', 'confirmed', 'denied', 'disputed', 'expired'],
    })
      .notNull()
      .default('pending'),
    verifierEmail: text('verifier_email').notNull(),
    verifierDomain: text('verifier_domain').notNull(),
    method: text('method', {
      enum: ['email_hr', 'email_manager', 'payroll_plaid', 'peer'],
    })
      .notNull()
      .default('email_hr'),
    tokenHash: text('token_hash').notNull(), // HMAC of verify token; raw token sent via email
    signature: text('signature'), // cryptographic proof once confirmed
    requestedAt: integer('requested_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    respondedAt: integer('responded_at', { mode: 'timestamp_ms' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    notes: text('notes'),
  },
  (t) => ({
    workHistoryIdx: index('employer_verifications_work_history_idx').on(t.workHistoryId),
  })
);

export const accounts = sqliteTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (a) => ({
    pk: primaryKey({ columns: [a.provider, a.providerAccountId] }),
  })
);

export const sessions = sqliteTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

export const verificationTokens = sqliteTable(
  'verificationTokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
  },
  (vt) => ({
    pk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ─────────────────────────────────────────────
// TrueHire domain tables
// ─────────────────────────────────────────────

/**
 * Raw GitHub contribution rollup per (user, repo).
 * Refreshed on ingest. One row per distinct repo touched.
 */
export const contributions = sqliteTable(
  'contributions',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    repoFullName: text('repo_full_name').notNull(),
    repoStars: integer('repo_stars').notNull().default(0),
    repoUrl: text('repo_url').notNull(),
    repoDescription: text('repo_description'),
    primaryLanguage: text('primary_language'),
    firstCommitAt: integer('first_commit_at', { mode: 'timestamp_ms' }),
    lastCommitAt: integer('last_commit_at', { mode: 'timestamp_ms' }),
    commits: integer('commits').notNull().default(0),
    additions: integer('additions').notNull().default(0),
    deletions: integer('deletions').notNull().default(0),
    mergedPrs: integer('merged_prs').notNull().default(0),
    isAuthor: integer('is_author', { mode: 'boolean' }).notNull().default(false),
    isFork: integer('is_fork', { mode: 'boolean' }).notNull().default(false),
    pushedAt: integer('pushed_at', { mode: 'timestamp_ms' }),
    // JSON-encoded CraftSignals for authored repos, null for external/unscanned
    craftJson: text('craft_json'),
    // weighted contribution value used in Recognition score
    weightedScore: real('weighted_score').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.repoFullName] }),
    userIdx: index('contributions_user_idx').on(t.userId),
  })
);

/**
 * Monthly activity bucket — used to compute Depth (months active) and
 * power the timeline chart without scanning every commit.
 */
export const activityMonths = sqliteTable(
  'activity_months',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // YYYY-MM bucket
    month: text('month').notNull(),
    commits: integer('commits').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.month] }),
    userIdx: index('activity_months_user_idx').on(t.userId),
  })
);

/**
 * Versioned score snapshot. Weekly recompute inserts a new row; current
 * score is the latest by computed_at.
 */
export const scores = sqliteTable(
  'scores',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    computedAt: integer('computed_at', { mode: 'timestamp_ms' }).notNull(),
    overall: integer('overall').notNull(),
    // signal1 = weighted composite of Depth/Breadth/Recognition/Craft/Spec (0-100).
    //           overall = signal1 + bonus(signal2). Kept separately so we can
    //           display each signal's own score cleanly.
    signal1: integer('signal1').notNull().default(0),
    // signal2 = employer verification (0-100), bonus applied to overall.
    signal2: integer('signal2').notNull().default(0),
    depth: integer('depth').notNull(),
    breadth: integer('breadth').notNull(),
    recognition: integer('recognition').notNull(),
    craft: integer('craft').notNull().default(0),
    specialization: integer('specialization').notNull(),
    // JSON payloads — kept as text for portability
    languagesJson: text('languages_json').notNull().default('[]'),
    evidenceJson: text('evidence_json').notNull().default('[]'),
    totalCommits: integer('total_commits').notNull().default(0),
    totalStars: integer('total_stars').notNull().default(0),
    totalRepos: integer('total_repos').notNull().default(0),
    monthsActive: integer('months_active').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.computedAt] }),
    // for fast "latest score" lookup
    userIdx: uniqueIndex('scores_user_computed_idx').on(t.userId, t.computedAt),
  })
);

// ─────────────────────────────────────────────
// Hiring domain tables
// ─────────────────────────────────────────────

export const hiringRoles = sqliteTable('hiring_roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  // JSON array of RoleRequirement
  requirementsJson: text('requirements_json').notNull().default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const hiringPipelines = sqliteTable('hiring_pipelines', {
  id: text('id').primaryKey(),
  roleId: text('role_id')
    .notNull()
    .references(() => hiringRoles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'closed', 'archived'] })
    .notNull()
    .default('active'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const pipelineCandidates = sqliteTable('pipeline_candidates', {
  id: text('id').primaryKey(),
  pipelineId: text('pipeline_id')
    .notNull()
    .references(() => hiringPipelines.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  stage: text('stage', {
    enum: ['shortlist', 'screening', 'technical', 'interview', 'decision', 'hired', 'rejected'],
  })
    .notNull()
    .default('shortlist'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const candidateEvaluations = sqliteTable('candidate_evaluations', {
  id: text('id').primaryKey(),
  pipelineCandidateId: text('pipeline_candidate_id')
    .notNull()
    .references(() => pipelineCandidates.id, { onDelete: 'cascade' }),
  stage: text('stage').notNull(),
  // JSON object mapping requirementId to { score: number, feedback: string }
  scoresJson: text('scores_json').notNull().default('{}'),
  overallRecommendation: text('overall_recommendation', {
    enum: ['strong_hire', 'hire', 'neutral', 'reject', 'strong_reject'],
  }),
  evaluatorId: text('evaluator_id')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// ─────────────────────────────────────────────
// AI build profile — SELF-ATTESTED companion signal (NOT part of the verified
// Signal 1/2/… ladder)
//
// Computed locally by the `truehire` CLI from a candidate's AI-coding tool logs
// (Claude Code / Cursor / Codex) and published here, bound to their GitHub-
// verified identity via a `truehire login` CLI token. The data is self-reported,
// so it is displayed as a clearly-labeled section and contributes ZERO to
// scores.overall.
// ─────────────────────────────────────────────

export const aiBuildProfiles = sqliteTable('ai_build_profiles', {
  // One row per user — latest published profile.
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  schemaVersion: text('schema_version').notNull(),
  cliVersion: text('cli_version').notNull(),
  // When the CLI computed it (client clock) vs. when we stored it (server clock).
  generatedAt: integer('generated_at', { mode: 'timestamp_ms' }).notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  // 0-100 weighted composite, null when the candidate had too little data.
  composite: integer('composite'),
  dataCompleteness: real('data_completeness').notNull().default(0),
  // JSON payloads — AiBuildDimension[], AiBuildSignals, { tool, fidelity }[].
  dimensionsJson: text('dimensions_json').notNull().default('[]'),
  signalsJson: text('signals_json').notNull().default('{}'),
  toolsDetectedJson: text('tools_detected_json').notNull().default('[]'),
});

/**
 * DEPRECATED — superseded by the `truehire login` flow (`cli_tokens` +
 * `cli_auth_sessions`). No code reads or writes this table anymore; kept only
 * to avoid a destructive migration on the freshly-created prod table. Drop in a
 * follow-up cleanup migration. (Tracked in PROJECT_STATUS.)
 */
export const cliPublishTokens = sqliteTable(
  'cli_publish_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp_ms' }),
  },
  (t) => ({
    userIdx: index('cli_publish_tokens_user_idx').on(t.userId),
  })
);

/**
 * Persistent, revocable CLI access tokens. Minted when a user completes the
 * `truehire login` browser-pairing flow and stored (hashed) on their machine.
 * `publish` authenticates with one of these. Only the HMAC is stored.
 */
export const cliTokens = sqliteTable(
  'cli_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    // Human-friendly label (e.g. hostname) for the connected-devices list.
    label: text('label'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
  },
  (t) => ({
    userIdx: index('cli_tokens_user_idx').on(t.userId),
  })
);

/**
 * Device-pairing handshake for `truehire login`. The CLI starts a session
 * (holding the raw deviceCode; we store only its hash), opens the browser to a
 * page showing `userCode`, and polls until the signed-in user approves. On the
 * first poll after approval a fresh `cli_tokens` row is minted and returned —
 * the raw token is never stored here.
 */
export const cliAuthSessions = sqliteTable(
  'cli_auth_sessions',
  {
    id: text('id').primaryKey(),
    deviceCodeHash: text('device_code_hash').notNull().unique(),
    // Short anti-phishing code shown in both the CLI and the approve page.
    userCode: text('user_code').notNull().unique(),
    status: text('status', {
      enum: ['pending', 'approved', 'granted', 'denied'],
    })
      .notNull()
      .default('pending'),
    // Set on approval — the user this CLI will be bound to.
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    label: text('label'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    userCodeIdx: index('cli_auth_sessions_user_code_idx').on(t.userCode),
  })
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
export type HiringRole = typeof hiringRoles.$inferSelect;
export type HiringPipeline = typeof hiringPipelines.$inferSelect;
export type PipelineCandidate = typeof pipelineCandidates.$inferSelect;
export type CandidateEvaluation = typeof candidateEvaluations.$inferSelect;
export type AiBuildProfile = typeof aiBuildProfiles.$inferSelect;
export type CliToken = typeof cliTokens.$inferSelect;
export type CliAuthSession = typeof cliAuthSessions.$inferSelect;
