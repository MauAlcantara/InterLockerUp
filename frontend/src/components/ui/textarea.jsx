'use client'

import React from 'react'
import { cn } from '../../lib/utils'

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border border-border rounded-lg bg-background px-3 py-2 text-sm font-roboto text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-[#0b4dbb] focus-visible:border-[#0b4dbb] disabled:cursor-not-allowed disabled:opacity-50 w-full min-h-[120px] resize-none transition-all',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }