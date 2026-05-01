import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "../../lib/utils";

const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-ink-300 bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 data-[state=checked]:bg-ink-900 dark:border-ink-700 dark:bg-ink-800 dark:data-[state=checked]:bg-ink-100",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 translate-x-0 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-5 dark:bg-ink-900"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = "Switch";

export { Switch };
