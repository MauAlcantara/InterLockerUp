import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/admin/sidebar"

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-muted">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
