import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]",
        secondary:
          "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-primary)]",
        outline:
          "border border-[var(--color-border-primary)] text-[var(--color-text-tertiary)]",
        warning:
          "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border border-[var(--color-warning-border)]",
        success:
          "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
        error:
          "bg-[var(--color-error-bg)] text-[var(--color-error-text)]",
        accent:
          "bg-[var(--color-accent-primary)] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
