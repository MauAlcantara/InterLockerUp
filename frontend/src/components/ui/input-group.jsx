"use client"

import React from "react"
import { cn } from "../../lib/utils"
import Button from "./button"
import { Input } from "./input"
import { Textarea } from "./textarea"

/* =========================
   CONTAINER
========================= */

function InputGroup({ className, children, ...props }) {
  return (
    <div
      role="group"
      className={cn(
        "relative flex w-full items-center",
        "rounded-lg border border-border",
        "bg-white",
        "transition-all",
        "focus-within:ring-2 focus-within:ring-primary/30",
        "focus-within:border-primary",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/* =========================
   ADDON (icon / text)
========================= */

function InputGroupAddon({
  className,
  align = "inline-start",
  children,
  ...props
}) {
  const alignmentStyles = {
    "inline-start": "pl-3 pr-2",
    "inline-end": "pr-3 pl-2",
    "block-start": "w-full px-3 pt-3 pb-2",
    "block-end": "w-full px-3 pb-3 pt-2",
  }

  return (
    <div
      data-align={align}
      className={cn(
        "flex items-center text-muted-foreground text-sm font-roboto",
        alignmentStyles[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/* =========================
   BUTTON INSIDE GROUP
========================= */

function InputGroupButton({
  className,
  size = "sm",
  ...props
}) {
  const sizeStyles = {
    xs: "h-6 px-2 text-xs rounded-md",
    sm: "h-8 px-3 text-sm rounded-md",
    "icon-xs": "h-6 w-6 p-0 rounded-md",
    "icon-sm": "h-8 w-8 p-0 rounded-md",
  }

  return (
    <Button
      className={cn(
        "shadow-none",
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
}

/* =========================
   TEXT (simple span)
========================= */

function InputGroupText({ className, ...props }) {
  return (
    <span
      className={cn(
        "flex items-center text-sm text-muted-foreground font-roboto",
        className
      )}
      {...props}
    />
  )
}

/* =========================
   INPUT
========================= */

function InputGroupInput({ className, ...props }) {
  return (
    <Input
      className={cn(
        "flex-1 border-0 bg-transparent",
        "rounded-none shadow-none",
        "focus-visible:ring-0",
        "h-12 px-3 font-roboto",
        className
      )}
      {...props}
    />
  )
}

/* =========================
   TEXTAREA
========================= */

function InputGroupTextarea({ className, ...props }) {
  return (
    <Textarea
      className={cn(
        "flex-1 border-0 bg-transparent",
        "rounded-none shadow-none",
        "focus-visible:ring-0",
        "py-3 px-3 font-roboto resize-none",
        className
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}