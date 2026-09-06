"use client"

import React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { Minus } from "lucide-react"
import { cn } from "../../lib/utils"

/* =========================
   MAIN WRAPPER
========================= */

function InputOTP({
  className,
  containerClassName,
  ...props
}) {
  return (
    <OTPInput
      containerClassName={cn(
        "flex items-center gap-2 justify-center",
        "disabled:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

/* =========================
   GROUP
========================= */

function InputOTPGroup({ className, ...props }) {
  return (
    <div
      className={cn("flex items-center", className)}
      {...props}
    />
  )
}

/* =========================
   SLOT (cada número)
========================= */

function InputOTPSlot({ index, className, ...props }) {
  const context = React.useContext(OTPInputContext)
  const slot = context?.slots?.[index]

  const char = slot?.char
  const isActive = slot?.isActive
  const hasFakeCaret = slot?.hasFakeCaret

  return (
    <div
      data-active={isActive}
      className={cn(
        "relative flex items-center justify-center",
        "h-12 w-12 text-lg font-roboto",
        "border border-border",
        "bg-white",
        "text-foreground",
        "transition-all duration-200",
        "first:rounded-l-lg last:rounded-r-lg",
        isActive && "border-primary ring-2 ring-primary/30 z-10",
        className
      )}
      {...props}
    >
      {char}

      {hasFakeCaret && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-5 w-[2px] bg-foreground animate-pulse" />
        </div>
      )}
    </div>
  )
}

/* =========================
   SEPARATOR
========================= */

function InputOTPSeparator(props) {
  return (
    <div
      role="separator"
      className="flex items-center justify-center text-muted-foreground"
      {...props}
    >
      <Minus className="w-4 h-4" />
    </div>
  )
}

export {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
}