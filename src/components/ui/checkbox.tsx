"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";
import { CTX } from "@/lib/context";
import type { Context } from "@/types";

interface Props extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  /** Cor do preenchimento conforme o contexto */
  tone?: Context;
}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, Props>(
  ({ className, tone, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer relative grid h-[18px] w-[18px] shrink-0 after:absolute after:-inset-1.5 after:content-[''] max-sm:after:-inset-2.5 place-items-center rounded-full border-[1.5px] border-muted-foreground/50 bg-transparent",
        "transition-[background-color,border-color,box-shadow] duration-150 hover:border-foreground hover:shadow-[0_0_0_4px_hsl(var(--foreground)/0.06)]",
        "data-[state=checked]:animate-pop data-[state=checked]:text-background",
        tone ? CTX[tone].check : "data-[state=checked]:border-foreground data-[state=checked]:bg-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator forceMount className="grid place-items-center data-[state=unchecked]:hidden">
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
          <path
            d="M2.6 6.3l2.4 2.4 4.5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1}
            className="animate-draw"
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
