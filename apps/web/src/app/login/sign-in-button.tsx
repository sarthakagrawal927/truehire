"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";
import { Button } from "@/components/atoms/button";

export function SignInButton({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  return (
    <Button
      size="lg"
      className="w-full"
      leftIcon={<Github className="h-4 w-4" />}
      onClick={() => signIn("github", { callbackUrl })}
    >
      Continue with GitHub
    </Button>
  );
}
