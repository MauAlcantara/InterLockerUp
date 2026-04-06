import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Header } from "@/components/admin/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Box, Users, AlertTriangle, ClipboardList, ChevronRight, TrendingUp, 
  TrendingDown, Clock, Bell, Activity, Calendar, Zap, Loader2
} from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar,
} from "recharts"


// Datos estáticos para gráficas y fallbacks
const usageData = [
  { day: "Lun", accesos: 145 }, { day: "Mar", accesos: 132 }, { day: "Mie", accesos: 168 },
  { day: "Jue", accesos: 154 }, { day: "Vie", accesos: 189 }, { day: "Sab", accesos: 45 }, { day: "Dom", accesos: 23 },
]

const hourlyData = [
  { hora: "7am", ocupacion: 15 }, { hora: "9am", ocupacion: 78 }, { hora: "11am", ocupacion: 92 },
  { hora: "1pm", ocupacion: 65 }, { hora: "3pm", ocupacion: 88 }, { hora: "5pm", ocupacion: 72 }, { hora: "7pm", ocupacion: 35 },
]

// Usaremos estas tareas pendientes porque no tenemos tabla en BD para ellas
const tareasPendientes = [
  { id: 1, tarea: "Revisar 5 solicitudes de locker", prioridad: "alta" },
  { id: 2, tarea: "Actualizar firmware edificio 2", prioridad: "media" },
  { id: 3, tarea: "Generar reporte mensual", prioridad: "baja" },
]

export default function DashboardPage() {
  const [hoveredAlert, setHoveredAlert] = useState<number | null>(null)
  
  // --- INICIO DE LÓGICA DINÁMICA ---
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/dashboard/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Formateadores para convertir datos de BD a tu diseño
  const displayAlerts = stats?.alertas?.length > 0 
    ? stats.alertas.map((a: any, i: number) => ({
        id: i,
        tipo: a.categoria === 'damage' ? 'error' : 'warning',
        mensaje: `Incidencia reportada en Locker ${a.locker || 'N/A'}`,
        tiempo: "Reciente"
      }))
    : []; // Si está vacío, la UI se adapta

  const displayActividad = stats?.actividadReciente?.length > 0
    ? stats.actividadReciente.map((act: any, i: number) => ({
        id: i,
        accion: `${act.accion} en ${act.locker}`,
        usuario: act.nombre_completo || "Usuario anónimo",
        tiempo: "Reciente"
      }))
    : [];
  // --- FIN DE LÓGICA DINÁMICA ---

  const primaryColor = "#0b4dbb"
  const secondaryColor = "#1f78ff"

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Conectando con la base de datos...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Hub Principal" description="Vista general del sistema" />

      <div className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* KPIs principales (AHORA DINÁMICOS) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tasa de Ocupacion</p>
                    <p className="text-2xl font-bold mt-1">{stats?.kpis?.tasaOcupacion || 0}%</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-[#2fa4a9]" />
                      <span className="text-xs text-[#2fa4a9]">+5% vs ayer</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Accesos Hoy</p>
                    <p className="text-2xl font-bold mt-1">{stats?.kpis?.accesosHoy || 0}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-[#2fa4a9]" />
                      <span className="text-xs text-[#2fa4a9]">+12% vs promedio</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#2fa4a9]/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[#2fa4a9]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tiempo Prom. Uso</p>
                    <p className="text-2xl font-bold mt-1">{stats?.kpis?.tiempoPromedio || 4.2}h</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingDown className="w-3 h-3 text-[#f2b705]" />
                      <span className="text-xs text-[#f2b705]">-8% vs semana</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#f2b705]/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#f2b705]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Disponibilidad</p>
                    <p className="text-2xl font-bold mt-1">{stats?.kpis?.disponibilidad || 0}%</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-muted-foreground">Sistema operativo</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Box className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graficos y Alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Accesos esta semana
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAccesos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8a8a8a' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8a8a8a' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="accesos" stroke={primaryColor} strokeWidth={2} fill="url(#colorAccesos)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ALERTAS DINÁMICAS */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  Alertas del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {displayAlerts.length > 0 ? (
                    displayAlerts.map((alerta: any) => (
                      <div
                        key={alerta.id}
                        className={`p-3 rounded-lg transition-colors cursor-pointer ${
                          hoveredAlert === alerta.id ? 'bg-muted' : 'bg-muted/50'
                        }`}
                        onMouseEnter={() => setHoveredAlert(alerta.id)}
                        onMouseLeave={() => setHoveredAlert(null)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            alerta.tipo === 'error' ? 'bg-[#c94a4a]' :
                            alerta.tipo === 'warning' ? 'bg-[#f2b705]' : 'bg-primary'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-tight">{alerta.mensaje}</p>
                            <p className="text-xs text-muted-foreground mt-1">{alerta.tiempo}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin alertas pendientes</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ocupacion, Actividad, Tareas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Ocupacion por Hora (Hoy)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8a8a' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8a8a' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [`${value}%`, 'Ocupacion']}
                      />
                      <Bar dataKey="ocupacion" fill={secondaryColor} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ACTIVIDAD DINÁMICA */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {displayActividad.length > 0 ? (
                    displayActividad.map((item: any) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-tight truncate">{item.accion}</p>
                          <div className="flex gap-2">
                            <p className="text-xs font-semibold text-muted-foreground">{item.usuario}</p>
                            <p className="text-xs text-muted-foreground">{item.tiempo}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin actividad reciente</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  Tareas Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {tareasPendientes.map((tarea) => (
                    <div key={tarea.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                      <p className="text-sm truncate flex-1">{tarea.tarea}</p>
                      <Badge
                        variant="secondary"
                        className={`text-xs flex-shrink-0 ${
                          tarea.prioridad === 'alta' ? 'bg-[#c94a4a]/10 text-[#c94a4a]' :
                          tarea.prioridad === 'media' ? 'bg-[#f2b705]/10 text-[#f2b705]' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {tarea.prioridad}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Accesos rapidos */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Accesos Rapidos</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Link to="/dashboard/lockers" className="group">
                <Card className="border-0 shadow-sm hover:shadow-md transition-all h-full">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Box className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-sm">Lockers</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/usuarios" className="group">
                <Card className="border-0 shadow-sm hover:shadow-md transition-all h-full">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#2fa4a9]/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-[#2fa4a9]" />
                    </div>
                    <span className="font-medium text-sm">Usuarios</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/incidencias" className="group">
                <Card className="border-0 shadow-sm hover:shadow-md transition-all h-full">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#f2b705]/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-[#f2b705]" />
                    </div>
                    <span className="font-medium text-sm">Incidencias</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/auditorias" className="group">
                <Card className="border-0 shadow-sm hover:shadow-md transition-all h-full">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-sm">Auditorias</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}