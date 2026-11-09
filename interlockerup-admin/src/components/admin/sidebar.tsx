import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Box,
  AlertTriangle,
  FileText,
  DatabaseBackup,
  RefreshCcw,
  Wifi,
  Boxes,
  Radar,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { BASE_URL } from "@/api/apiConfig"
import logo from "@/assets/logo.png"

interface MenuItem {
  title: string
  href: string
  icon: typeof Users
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

const menuSections: MenuSection[] = [
  {
    title: "Principal",
    items: [
      { title: "Hub Principal", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Gestión",
    items: [
      { title: "Usuarios", href: "/dashboard/usuarios", icon: Users },
      { title: "Lockers", href: "/dashboard/lockers", icon: Box },
      { title: "Incidencias", href: "/dashboard/incidencias", icon: AlertTriangle },
      { title: "Rotación", href: "/dashboard/rotacion", icon: RefreshCcw },
    ],
  },
  {
    title: "IoT",
    items: [
      { title: "Monitoreo", href: "/dashboard/monitoring", icon: Radar },
      { title: "Conectividad", href: "/dashboard/iot", icon: Wifi },
      { title: "Estado de Lockers", href: "/dashboard/lockers-estado", icon: Boxes },
      { title: "Alertas", href: "/dashboard/alertas", icon: AlertTriangle },
    ],
  },
  {
    title: "Sistema",
    items: [
      { title: "Auditorías", href: "/dashboard/auditorias", icon: FileText },
      { title: "Respaldos", href: "/dashboard/respaldos", icon: DatabaseBackup },
    ],
  },
]

export function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    const token = localStorage.getItem("admin_token")
    if (token) {
      try {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        })
      } catch (err) {
        console.error("Error al cerrar sesión en servidor:", err)
      }
    }
    localStorage.removeItem("admin_token")
    void navigate("/")
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white overflow-hidden shadow-sm">
            <img src={logo} alt="logo" className="w-full h-full object-contain p-1" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold tracking-tight">InterLockerUp</h1>
              <p className="text-xs text-sidebar-foreground/70">Admin Panel</p>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation agrupada por sección */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {menuSections.map((section) => (
          <div key={section.title}>
            {collapsed ? (
              <div className="h-px bg-sidebar-border/60 mx-2 mb-2" />
            ) : (
              <p className="px-4 pb-1.5 text-[10px] uppercase tracking-widest text-sidebar-foreground/50 font-semibold">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
