import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db, schema } from "@truehire/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      githubUsername?: string | null;
      githubId?: number | null;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: DrizzleAdapter(db as any, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_SECRET,
      authorization: {
        params: { scope: "read:user user:email public_repo" },
      },
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          githubId: profile.id,
          githubUsername: profile.login,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      },
    }),
  ],
  session: { strategy: "database" },
  trustHost: true,
  pages: { signIn: "/login" },
  events: {
    async signIn({ user, account }) {
      // We used to kick off ingest here as fire-and-forget, but Vercel
      // serverless kills the lambda the moment this callback returns, so the
      // ingest promise was being discarded mid-flight. The dashboard now
      // drives ingest explicitly via /api/refresh, which owns its lambda
      // lifetime (maxDuration: 120s).
      //
      // We only touch status here: leaving it "idle" so the client-side
      // effect in /dashboard can trigger a real refresh.
      if (!account || account.provider !== "github" || !user?.id) return;
      await db
        .update(schema.users)
        .set({ ingestStatus: "idle" })
        .where(eq(schema.users.id, user.id));
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.githubUsername = (user as any).githubUsername ?? null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.githubId = (user as any).githubId ?? null;
      }
      return session;
    },
  },
});
