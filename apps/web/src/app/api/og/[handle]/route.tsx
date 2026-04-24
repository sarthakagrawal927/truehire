import { ImageResponse } from "next/og";
import { getLatestScore, getUserByUsername } from "@/lib/score-service";

export const runtime = "nodejs"; // Drizzle/libsql — not edge
export const contentType = "image/png";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> },
) {
  const { handle } = await ctx.params;
  const clean = handle.startsWith("@") ? handle.slice(1) : handle;

  const user = await getUserByUsername(clean);
  const score = user ? await getLatestScore(user.id) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#0a0a0b",
          color: "#f6f5f2",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#f6f5f2",
              color: "#0a0a0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>
            TrueHire
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 56 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 22,
                color: "#8a8a93",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Signal 1 · public work
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 600,
                letterSpacing: -1,
                marginTop: 8,
              }}
            >
              @{clean}
            </div>
            {user?.name && (
              <div style={{ fontSize: 28, color: "#8a8a93", marginTop: 4 }}>
                {user.name}
              </div>
            )}
          </div>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                fontSize: 18,
                color: "#8a8a93",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Score
            </div>
            <div
              style={{
                fontSize: 220,
                lineHeight: 1,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {score?.overall ?? "—"}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#8a8a93",
            borderTop: "1px solid #23232a",
            paddingTop: 20,
          }}
        >
          <div style={{ display: "flex", gap: 24 }}>
            {score && (
              <>
                <span>Depth {score.depth}</span>
                <span>Breadth {score.breadth}</span>
                <span>Recognition {score.recognition}</span>
                <span>Specialization {score.specialization}</span>
              </>
            )}
          </div>
          <div>truehire.dev/{clean}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
