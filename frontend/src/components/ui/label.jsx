"use client"

import React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cn } from "../../lib/utils"

function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        /* base */
        "flex items-center gap-2",
        "text-sm leading-none",
        "font-medium font-montserrat",
        "select-none",

        /* colors */
        "text-gray-700 dark:text-gray-300",

        /* disabled states */
        "group-data-[disabled=true]:pointer-events-none",
        "group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed",
        "peer-disabled:opacity-50",

        className
      )}
      {...props}
    />
  )
}

export { Label }