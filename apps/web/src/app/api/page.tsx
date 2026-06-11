import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/atoms/card";

export const metadata: Metadata = {
  title: "API — TrueHire",
  description:
    "Public read-only endpoints to pull TrueHire profile data programmatically. JSON, no auth, no API key.",
};

interface Endpoint {
  method: string;
  path: string;
  description: string;
  example?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/@:handle/data.json",
    description:
      "Public profile snapshot — score, latest activity months, public work history. Caches for 60s.",
    example: "curl https://truehire.workers.dev/@torvalds/data.json",
  },
  {
    method: "GET",
    path: "/sitemap.xml",
    description: "Standard sitemap with all public pages.",
  },
  {
    method: "GET",
    path: "/robots.txt",
    description: "Crawler rules, links to /sitemap.xml.",
  },
];

export default function ApiPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-xs text-stone-500 hover:underline">
        ← TrueHire
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">API</h1>
      <p className="mt-3 text-sm text-stone-600">
        Public, read-only endpoints. No auth, no API key. Everything is
        cached at the edge.
      </p>

      <div className="mt-8 space-y-4">
        {ENDPOINTS.map((e) => (
          <Card key={e.path}>
            <CardHeader>
              <CardTitle>
                <span className="mr-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {e.method}
                </span>
                <code className="text-base">{e.path}</code>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-stone-700">{e.description}</p>
              {e.example && (
                <pre className="mt-3 overflow-x-auto rounded bg-stone-100 p-3 text-xs">
                  {e.example}
                </pre>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      <p className="mt-10 text-xs text-stone-500">
        Want a different shape? Open an issue — most read-side data is
        already in Drizzle queries that could be exposed.
      </p>
    </main>
  );
}
