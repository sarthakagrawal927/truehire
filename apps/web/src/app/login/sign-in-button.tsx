"use client";

import { signIn } from "next-auth/react";
import { GithubIcon as Github } from "@/components/atoms/github-icon";
import { Button } from "@/components/atoms/button";
import { captureAuthFailure } from "@/lib/foundry-monitoring";

export function SignInButton({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  async function handleSignIn() {
    try {
      const result = await signIn("github", { callbackUrl, redirect: false });
      if (result?.error) {
        captureAuthFailure({
          provider: "github",
          stage: "signin",
          reason: result.error,
          source: "sign-in-button",
        });
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      captureAuthFailure({
        provider: "github",
        stage: "signin",
        reason: error instanceof Error ? error.message : "GitHub sign-in failed",
        source: "sign-in-button",
      });
    }
  }

  return (
    <Button
      size="lg"
      className="w-full"
      leftIcon={<Github className="h-4 w-4" />}
      onClick={() => void handleSignIn()}
    >
      Continue with GitHub
    </Button>
  );
}
