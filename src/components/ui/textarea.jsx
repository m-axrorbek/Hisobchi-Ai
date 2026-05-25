import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[120px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 shadow-none outline-none transition-[border-color,box-shadow,background-color] placeholder:text-ink-400 focus-visible:border-ink-400 focus-visible:ring-1 focus-visible:ring-ink-300/45 dark:border-white/10 dark:bg-black/20 dark:text-ink-100 dark:placeholder:text-ink-500 dark:focus-visible:border-white/35 dark:focus-visible:ring-white/10",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
