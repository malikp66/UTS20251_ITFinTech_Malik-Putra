import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-3xl border text-sm font-semibold uppercase tracking-wide transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-[#05050f]",
  {
    variants: {
      variant: {
        default:
          "border-primary/40 bg-gradient-to-r from-primary via-purple-500 to-indigo-500 text-white shadow-[0_0_32px_rgba(99,102,241,0.45)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] hover:brightness-110 motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        destructive:
          "border-destructive/80 bg-destructive text-destructive-foreground shadow-[0_0_28px_rgba(239,68,68,0.35)] hover:bg-destructive/85 hover:shadow-[0_0_34px_rgba(239,68,68,0.45)] motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-2",
        outline:
          "border-primary/40 bg-transparent text-primary shadow-[0_0_26px_rgba(99,102,241,0.25)] hover:bg-gradient-to-r hover:from-primary/15 hover:via-purple-500/15 hover:to-indigo-500/15 hover:text-white hover:shadow-[0_0_34px_rgba(99,102,241,0.45)] motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        secondary:
          "border-primary/30 bg-primary/10 text-primary shadow-[0_0_24px_rgba(99,102,241,0.28)] hover:border-primary/60 hover:bg-primary/20 hover:text-primary-foreground hover:shadow-[0_0_32px_rgba(99,102,241,0.45)] motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        ghost:
          "border-primary/30 bg-transparent text-muted-foreground hover:border-white/15 hover:bg-gradient-to-r hover:from-primary/10 hover:via-purple-500/10 hover:to-indigo-500/10 hover:text-foreground hover:shadow-[0_0_18px_rgba(99,102,241,0.25)] motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
        link:
          "border-transparent bg-transparent text-primary underline-offset-4 hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 rounded-3xl px-4",
        lg: "h-12 rounded-3xl px-9",
        icon: "h-11 w-11 rounded-[40px]"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(className, buttonVariants({ variant, size }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
