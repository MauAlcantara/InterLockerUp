import { Link, useLocation, useNavigate } from "react-router-dom" // <-- Agregamos useNavigate
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Box,
  AlertTriangle,
  FileText,
  LogOut,
  Lock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const menuItems = [
  { title: "Hub Principal", href: "/dashboard", icon: LayoutDashboard },
  { title: "Usuarios", href: "/dashboard/usuarios", icon: Users },
  { title: "Lockers", href: "/dashboard/lockers", icon: Box },
  { title: "Incidencias", href: "/dashboard/incidencias", icon: AlertTriangle },
  { title: "Auditorias", href: "/dashboard/auditorias", icon: FileText },
]

export function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate() // <-- Inicializamos el hook de navegación
  const [collapsed, setCollapsed] = useState(false)

  // <-- FUNCIÓN DE LOGOUT -->
  const handleLogout = () => {
    localStorage.removeItem("admin_token"); // 1. Destruimos el token
    navigate("/"); // 2. Redirigimos al Login
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
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar-accent">
            <Lock className="w-5 h-5" />
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

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer (AQUÍ ESTÁ EL CAMBIO PRINCIPAL) */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Cerrar sesion</span>}
        </button>
      </div>
    </aside>
  )
}