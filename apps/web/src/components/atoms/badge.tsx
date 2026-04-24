import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight",
  {
    variants: {
      tone: {
        neutral:
          "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
        outline:
          "border-[var(--border-strong)] bg-transparent text-[var(--foreground)]",
        verified:
          "border-[color:color-mix(in_srgb,var(--verified)_40%,var(--border))] bg-[var(--verified-bg)] text-[var(--verified)]",
        strong:
          "border-transparent bg-[var(--foreground)] text-[var(--background)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type Props = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>;

export function Badge({ className, tone, ...rest }: Props) {
  return <span className={cn(badge({ tone }), className)} {...rest} />;
}
