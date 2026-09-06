import { useState } from "react"

export type Toast = {
  id: string
  title?: any
  description?: any
  action?: any
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const toast = (props: Omit<Toast, "id">) =>
    setToasts((prev) => [...prev, { id: String(Date.now()), ...props }])
  return { toasts, toast }
}