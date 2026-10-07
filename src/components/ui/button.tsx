import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[0.8125rem] font-medium transition-[transform,background-color,opacity,color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-40 active:scale-[.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-btn hover:-translate-y-px hover:brightness-[1.25] hover:shadow-[0_2px_4px_hsl(var(--shadow)/0.25),0_10px_20px_-8px_hsl(var(--shadow)/0.5)] active:translate-y-0 dark:hover:brightness-95",
        soft: "bg-hover text-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-hover hover:text-foreground",
      },
      size: {
        default: "h-11 px-4 text-sm sm:h-9 sm:px-3.5 sm:text-[0.8125rem]",
        sm: "h-9 px-3 text-[0.8125rem] sm:h-7 sm:px-2.5 sm:text-xs",
        icon: "h-10 w-10 sm:h-8 sm:w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
