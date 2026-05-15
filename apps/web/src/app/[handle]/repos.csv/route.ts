import { getContributions, getUserByUsername } from "@/lib/score-service";

export const dynamic = "force-dynamic";

function csvEscape(value: string | number | null): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Per-handle CSV of every authored contribution that powers the
 * profile score — repo, language, commits, merged PRs, stars,
 * additions/deletions, first/last commit date. Handy for resume
 * attachments, dispute resolution, and grant applications where a
 * verifiable activity export is wanted.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> },
) {
  const { handle } = await ctx.params;
  const clean = handle.startsWith("@") ? handle.slice(1) : handle;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(clean)) {
    return new Response("invalid handle", { status: 400 });
  }

  const user = await getUserByUsername(clean);
  if (!user) return new Response("not found", { status: 404 });

  const rows = await getContributions(user.id);

  const header = [
    "repo",
    "primary_language",
    "commits",
    "merged_prs",
    "stars",
    "additions",
    "deletions",
    "is_author",
    "is_fork",
    "first_commit_at",
    "last_commit_at",
    "pushed_at",
    "repo_url",
  ];

  const lines = [header.join(",")];
  for (const c of rows) {
    lines.push(
      [
        csvEscape(c.repoFullName),
        csvEscape(c.primaryLanguage),
        csvEscape(c.commits),
        csvEscape(c.mergedPrs),
        csvEscape(c.repoStars),
        csvEscape(c.additions),
        csvEscape(c.deletions),
        csvEscape(c.isAuthor ? "1" : "0"),
        csvEscape(c.isFork ? "1" : "0"),
        csvEscape(c.firstCommitAt ? c.firstCommitAt.toISOString() : null),
        csvEscape(c.lastCommitAt ? c.lastCommitAt.toISOString() : null),
        csvEscape(c.pushedAt ? c.pushedAt.toISOString() : null),
        csvEscape(c.repoUrl),
      ].join(","),
    );
  }

  return new Response(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${clean}-repos.csv"`,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
    },
  });
}
