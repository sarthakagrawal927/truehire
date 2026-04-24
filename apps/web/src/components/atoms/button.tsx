import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-[background,color,border,opacity,transform] duration-150 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90",
        secondary:
          "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border-strong)] hover:bg-[var(--surface)]",
        ghost:
          "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)]",
        outline:
          "bg-transparent text-[var(--foreground)] border border-[var(--border-strong)] hover:bg-[var(--surface-2)]",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & { leftIcon?: ReactNode; rightIcon?: ReactNode };

export function Button({
  className,
  variant,
  size,
  leftIcon,
  rightIcon,
  children,
  ...rest
}: Props) {
  return (
    <button className={cn(button({ variant, size }), className)} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
