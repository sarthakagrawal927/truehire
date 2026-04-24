"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/atoms/button";

export function CopyProfileLink({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    const base = window.location.origin;
    const url = `${base}/${username}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handle}
      leftIcon={copied ? <Check className="h-4 w-4 text-[var(--verified)]" /> : <LinkIcon className="h-4 w-4" />}
    >
      {copied ? "Copied" : "Copy profile link"}
    </Button>
  );
}
