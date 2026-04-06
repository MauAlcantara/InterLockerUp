import { useState, useEffect } from "react"
import { Bell, Search, User, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

// Asegúrate de importar tu API_URL. Ajusta la ruta según la estructura de tu proyecto admin.
// import { API_URL } from "@/config" 

interface HeaderProps {
  title: string
  description?: string
}

interface AppNotification {
  id: number
  titulo: string
  mensaje: string
  tiempo: string
  leida: boolean
}

export function Header({ title, description }: HeaderProps) {
  const [adminName, setAdminName] = useState("Administrador")
  const [notificaciones, setNotificaciones] = useState<AppNotification[]>([])
  
  // Asumimos API_URL para el ejemplo, cámbialo por tu variable real si la tienes
  const API_URL = "http://localhost:3000/api" 

  useEffect(() => {
    // 1. Cargar el nombre real del admin desde el almacenamiento
    const nombre = localStorage.getItem('userName') || "Admin UTEQ"
    setAdminName(nombre)

    // 2. Función para buscar notificaciones frescas
    const fetchNotificaciones = async () => {
      try {
        const token = localStorage.getItem("admin_token")
        if (!token) return

        const res = await fetch(`${API_URL}/admin/notificaciones`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
        
        if (res.ok) {
          const data = await res.json()
          setNotificaciones(data)
        }
      } catch (error) {
        console.error("Error al cargar notificaciones:", error)
      }
    }

    // Ejecutar al inicio
    fetchNotificaciones()

    // 3. Patrón de Polling: Preguntar al backend cada 30 segundos (30000 ms)
    const interval = setInterval(fetchNotificaciones, 30000)
    
    // Limpieza
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("userName")
    window.location.href = "/" // O usa el hook de navegación que tengas configurado
  }

  // Contamos cuántas no han sido leídas
  const unreadCount = notificaciones.filter(n => !n.leida).length

  return (
    <header className="flex items-center justify-between px-8 py-4 bg-card border-b border-border">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground font-serif mt-1">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-64 pl-10 bg-muted border-0 font-serif"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive animate-in zoom-in">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
            <DropdownMenuLabel>Notificaciones recientes</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {notificaciones.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground font-serif">
                No hay notificaciones nuevas.
              </div>
            ) : (
              notificaciones.map((notif) => (
                <DropdownMenuItem key={notif.id} className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-medium ${!notif.leida ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notif.titulo}
                    </span>
                    {!notif.leida && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-sm text-muted-foreground font-serif">{notif.mensaje}</span>
                  <span className="text-xs text-muted-foreground/60">{notif.tiempo}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{adminName}</p>
                <p className="text-xs text-muted-foreground font-serif">Administrador</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer" 
              onClick={() => window.location.href = "/dashboard/perfil"}
            >
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 cursor-pointer flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}