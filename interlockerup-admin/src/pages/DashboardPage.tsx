import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Header } from "@/components/admin/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Box, Users, AlertTriangle, ClipboardList, ChevronRight, TrendingUp, 
  TrendingDown, Clock, Bell, Activity, Calendar, Zap, Loader2, Check, X
} from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar,
} from "recharts"

// API URL - Apuntando al grupo de rutas de administración corregido
const API_URL = "http://vigilia.world:3000/api/admin";

const usageData = [
  { day: "Lun", accesos: 145 }, { day: "Mar", accesos: 132 }, { day: "Mie", accesos: 168 },
  { day: "Jue", accesos: 154 }, { day: "Vie", accesos: 189 }, { day: "Sab", accesos: 45 }, { day: "Dom", accesos: 23 },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Función para obtener el token (centralizada)
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/stats`, {
        method: 'GET',
        headers: getAuthHeader()
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        console.error("Sesión no válida o expirada");
        // Aquí podrías redirigir al login si fuera necesario
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRequestAction = async (requestId: number, action: 'approved' | 'rejected') => {
    const confirmMsg = action === 'approved' ? "¿Aprobar asignación de locker?" : "¿Rechazar esta solicitud?";
    if (!confirm(confirmMsg)) return;

    setProcessingId(requestId);
    try {
      const response = await fetch(`${API_URL}/requests/${requestId}`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify({ status: action })
      });

      if (response.ok) {
        // Refrescamos los datos para que la solicitud desaparezca de la lista
        await fetchStats(); 
      } else {
        alert("Error al procesar la solicitud. Verifica tus permisos de administrador.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión con el servidor vigilia.world.");
    } finally {
      setProcessingId(null);
    }
  };

  // Formateo de datos recibidos del Backend
  const displayAlerts = stats?.alertas?.map((a: any, i: number) => ({
    id: i,
    tipo: a.categoria === 'damage' ? 'error' : 'warning',
    mensaje: `Incidencia en Locker ${a.locker_identificador || 'N/A'}`,
    tiempo: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })) || [];

  const displayActividad = stats?.actividadReciente?.map((act: any, i: number) => ({
    id: i,
    accion: `${act.accion} en ${act.locker_numero}`,
    usuario: act.nombre_completo || "Usuario",
    tiempo: "Hoy"
  })) || [];

  const primaryColor = "#0b4dbb"

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Sincronizando con vigilia.world...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Hub Principal" description="Gestión de InterLockerUp" />

      <div className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* KPIs Dinámicos */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ocupación</p>
                    <p className="text-2xl font-bold mt-1">{stats?.kpis?.tasaOcupacion || 0}%</p>
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
                    <p className="text-sm text-muted-foreground">Incidentes</p>
                    <p className="text-2xl font-bold mt-1">{stats?.alertas?.length || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#f2b705]/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-[#f2b705]" />
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
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Box className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gráfica Semanal */}
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Uso del Sistema (Semanal)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 h-48">
<ResponsiveContainer width="100%" height="100%">
  {/* Cambiamos usageData por stats?.usoSemanal */}
  <AreaChart data={stats?.usoSemanal || []}>
    <XAxis 
      dataKey="day" 
      axisLine={false} 
      tickLine={false} 
      tick={{fontSize: 12, fill: '#888'}}
      dy={10}
    />
    <YAxis hide />
    <Tooltip 
      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
    />
    <Area 
      type="monotone" 
      dataKey="accesos" 
      stroke={primaryColor} 
      strokeWidth={3}
      fillOpacity={0.1} 
      fill={primaryColor} 
    />
  </AreaChart>
</ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Alertas Críticas */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  Alertas Críticas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {displayAlerts.length > 0 ? displayAlerts.map((alerta: any) => (
                  <div key={alerta.id} className="p-2 bg-muted/30 rounded-md border-l-4 border-red-500">
                    <p className="text-xs font-medium">{alerta.mensaje}</p>
                    <p className="text-[10px] text-muted-foreground">{alerta.tiempo}</p>
                  </div>
                )) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">Sin alertas pendientes</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Solicitudes de Alumnos (Control Maestro) */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  Solicitudes de Alumnos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {stats?.solicitudesPendientes?.length > 0 ? (
                  stats.solicitudesPendientes.map((sol: any) => (
                    <div key={sol.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{sol.nombre_completo}</p>
                        <p className="text-xs text-muted-foreground">Locker: {sol.locker_identificador}</p>
                      </div>
                      <div className="flex gap-2">
                        {processingId === sol.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        ) : (
                          <>
                            <button 
                              onClick={() => handleRequestAction(sol.id, 'approved')}
                              className="p-1.5 bg-green-500/10 text-green-600 rounded-md hover:bg-green-600 hover:text-white transition-all"
                              title="Aprobar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleRequestAction(sol.id, 'rejected')}
                              className="p-1.5 bg-red-500/10 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-all"
                              title="Rechazar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Check className="w-8 h-8 text-green-500 mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-muted-foreground">No hay solicitudes pendientes</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Logs de Acceso Reales */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  Logs de Acceso
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {displayActividad.length > 0 ? displayActividad.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="text-xs">
                      <p className="font-medium">{item.accion}</p>
                      <p className="text-muted-foreground">{item.usuario}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-center text-muted-foreground py-6">Sin actividad hoy</p>
                )}
              </CardContent>
            </Card>

            {/* Navegación Rápida */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  Navegación
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2">
                <Link to="/dashboard/lockers" className="flex items-center justify-between p-2 hover:bg-muted rounded-md text-sm transition-colors">
                  <div className="flex items-center gap-2"><Box className="w-4 h-4" /> Lockers</div>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link to="/dashboard/usuarios" className="flex items-center justify-between p-2 hover:bg-muted rounded-md text-sm transition-colors">
                  <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Usuarios</div>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link to="/dashboard/incidencias" className="flex items-center justify-between p-2 hover:bg-muted rounded-md text-sm transition-colors">
                  <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Incidencias</div>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}