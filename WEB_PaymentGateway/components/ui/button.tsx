import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-3xl text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-background relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-md hover:from-primary/70 hover:via-primary/60 hover:to-primary/40 hover:brightness-110 hover:shadow-xl motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80 hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98]",
        outline:
          "border border-input bg-background shadow-sm hover:border-accent hover:bg-accent/60 hover:text-accent-foreground hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/70 hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98]",
        ghost:
          "hover:bg-accent/40 hover:text-accent-foreground hover:shadow-sm motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.99]",
        link:
          "text-primary underline-offset-4 hover:text-primary/80 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-3xl px-3",
        lg: "h-11 rounded-3xl px-8",
        icon: "h-10 w-10"
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
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
