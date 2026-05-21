/**
 * Owner-facing analytics — the fixed 4-event taxonomy.
 *
 * EVERY fleet project emits exactly these four events — `signup`, `activated`,
 * `core_action`, `returned` — so a single PostHog project can build one
 * cross-fleet funnel (signup -> activated -> core_action) and a D1/D7
 * retention insight, with no custom dashboard.
 *
 * Every event carries a `project` property. This is what makes per-app and
 * cross-fleet views possible from one PostHog login.
 *
 * The wrapper is isomorphic: in the browser it routes through
 * `@saas-maker/posthog-client` (`track`); inside a server action / route
 * handler it routes through `@saas-maker/posthog-client/server` so the
 * server-triggered events (`activated`, `core_action`) still land.
 */

import {
  createPostHogServer,
  getServerClient,
  trackServer,
} from "@saas-maker/posthog-client/server";

// NOTE: `@saas-maker/posthog-client` (the browser entry) bundles `PostHogProvider`,
// which calls `React.createContext` at module-evaluation time. A static top-level
// import would therefore execute `createContext` during SSR / `next build` page-data
// collection and crash with "createContext is not a function". This module is
// isomorphic and only needs the browser client inside the browser branch of
// `emit()`, so the browser client is loaded lazily via dynamic `import()` there.
// The `/server` entry above is React-free (`posthog-node`) and is safe to import
// statically.

const PROJECT = "truehire" as const;

// Shared with foundry-monitoring.ts — the same PostHog project.
const POSTHOG_KEY =
  process.env["NEXT_PUBLIC_POSTHOG_KEY"] ??
  "phc_qgiAarw4Co4pw9fz3Fxj4UJaHmqzFetqs4JrXhGc35Nd";
const POSTHOG_HOST =
  process.env["NEXT_PUBLIC_POSTHOG_HOST"] ?? "https://us.i.posthog.com";

/**
 * The product-specific action behind a `core_action` event.
 * TrueHire exists to turn public work into a trustworthy credential:
 *  - `score_refreshed`  — a GitHub ingest completed and produced a score.
 *  - `role_fit_run`     — a job description was scored against a profile.
 *  - `work_history_added` — the candidate added a verifiable employment entry.
 */
export type CoreAction =
  | "score_refreshed"
  | "role_fit_run"
  | "work_history_added";

/**
 * The fixed taxonomy. Do NOT add events here — the whole point is that all
 * fleet projects emit the same four. Product-specific detail goes in
 * `CoreAction` (or as extra properties), never as a new top-level event name.
 */
interface AnalyticsEventMap {
  /** First session after an account is created. */
  signup: { project: typeof PROJECT };
  /** The user reaches first real value — their first computed score. */
  activated: { project: typeof PROJECT };
  /** The thing the product exists to do. */
  core_action: { project: typeof PROJECT; action: CoreAction };
  /** A return session by a user with prior activity. */
  returned: { project: typeof PROJECT };
}

function ensureServerClient() {
  if (!getServerClient()) {
    createPostHogServer({ apiKey: POSTHOG_KEY, host: POSTHOG_HOST });
  }
}

function emit<K extends keyof AnalyticsEventMap>(
  event: K,
  props: Omit<AnalyticsEventMap[K], "project">,
  distinctId?: string,
): void {
  const payload = { project: PROJECT, ...props };
  try {
    if (typeof window === "undefined") {
      // Server context (server action / route handler).
      ensureServerClient();
      trackServer(event, {
        distinctId: distinctId ?? `${PROJECT}-server`,
        properties: payload,
      });
    } else {
      // Browser context. Load the browser client lazily so the React-dependent
      // `@saas-maker/posthog-client` entry is never evaluated during SSR.
      void import("@saas-maker/posthog-client")
        .then(({ track }) => {
          track(event, payload);
        })
        .catch(() => {
          // Analytics must NEVER break a user flow. Swallow and move on.
        });
    }
  } catch {
    // Analytics must NEVER break a user flow. Swallow and move on.
  }
}

/**
 * Fire once, on the first session after an account is created.
 * Pass `distinctId` when firing from a server context (e.g. an auth event)
 * so the event attaches to the right user.
 */
export function trackSignup(distinctId?: string): void {
  emit("signup", {}, distinctId);
}

/**
 * Fire once, when the user first reaches real product value (their first
 * computed score). Pass `distinctId` when firing from a server context so the
 * event attaches to the right user.
 */
export function trackActivated(distinctId?: string): void {
  emit("activated", {}, distinctId);
}

/** Fire on each completion of a core product action. */
export function trackCoreAction(action: CoreAction, distinctId?: string): void {
  emit("core_action", { action }, distinctId);
}

/**
 * Fire on session start for a user who has prior activity.
 * Pass `distinctId` when firing from a server context so the event attaches
 * to the right user.
 */
export function trackReturned(distinctId?: string): void {
  emit("returned", {}, distinctId);
}
