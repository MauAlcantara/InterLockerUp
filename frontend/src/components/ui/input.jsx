import React from "react"
import { cn } from "../../lib/utils"

function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* base */
        "w-full min-w-0 h-9 px-3 py-1",
        "rounded-md border",
        "text-sm font-sans",
        "outline-none transition-[color,box-shadow]",

        /* colors */
        "bg-background dark:bg-gray-950",
        "border-border dark:border-gray-800",
        "text-foreground dark:text-gray-50",
        "placeholder:text-muted-foreground dark:placeholder:text-gray-500",

        /* file input */
        "file:inline-flex file:h-7 file:border-0",
        "file:bg-transparent file:text-sm file:font-medium",

        /* focus */
        "focus-visible:border-[#1f78ff]",
        "focus-visible:ring-[3px]",
        "focus-visible:ring-[#1f78ff]/40",

        /* invalid */
        "aria-invalid:border-[#c94a4a]",
        "aria-invalid:ring-[#c94a4a]/30",

        /* disabled */
        "disabled:pointer-events-none",
        "disabled:cursor-not-allowed",
        "disabled:opacity-50",

        /* selection */
        "selection:bg-[#0b4dbb]",
        "selection:text-white",

        className
      )}
      {...props}
    />
  )
}

export { Input }