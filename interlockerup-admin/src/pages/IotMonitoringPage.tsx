import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { Header } from "@/components/admin/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  Lock,
  Clock,
  Loader2,
  Lock,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fastFetch } from "@/api/apiConfig"

interface LockerMonitoreo {
  id: number
  identificador: string
  estado: string
  edificio: string | null
  piso: number | null
  ubicacion: string | null
  device_id: string | null
  online: boolean
  last_seen: string | null
  alertas: { pendientes: number; criticas: number }
  actuador: {
    pendientes: number
    ultimo: { accion: string; ejecutado: boolean; creado_en: string | null } | null
  }
}

interface RespuestaMonitoreo {
  resumen: {
    total_lockers: number
    online: number
    offline: number
    sin_dispositivo: number
    alertas_pendientes: number
    alertas_criticas: number
    actuadores_pendientes: number
  }
  lockers: LockerMonitoreo[]
}

const formatoFecha = (iso: string | null) => {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" })
}

export default function IotMonitoringPage() {
  const [data, setData] = useState<RespuestaMonitoreo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchMonitoreo = useCallback(async () => {
    try {
      const res = await fastFetch("/iot/monitoring")
      if (!res.ok) {
        setError("No se pudo cargar el monitoreo (error " + res.status + ")")
        return
      }
      const json: RespuestaMonitoreo = await res.json()
      setData(json)
      setError(null)
      setLastUpdated(new Date().toISOString())
    } catch (e) {
      console.error("Error cargando monitoreo:", e)
      setError("Error de red al consultar el monitoreo")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMonitoreo()
    const interval = setInterval(() => { void fetchMonitoreo() }, 30000)
    return () => clearInterval(interval)
  }, [fetchMonitoreo])

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando monitoreo...</p>
      </div>
    )
  }

  const lockers = (data?.lockers ?? []).filter(l =>
    l.identificador.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.edificio ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Monitoreo IoT"
        description="Vista unificada de conectividad, estado de lockers, actuadores y alertas en tiempo real"
      />

      <div className="flex-1 p-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-error/40 bg-error/10 p-4 text-error text-sm">
            {error}
          </div>
        )}

        {/* Resumen */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-serif">Lockers</span>
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{data.resumen.total_lockers}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-serif">En línea</span>
                <Wifi className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className={cn("text-2xl font-bold", data.resumen.online > 0 && "text-available")}>{data.resumen.online}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-serif">Fuera de línea</span>
                <WifiOff className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className={cn("text-2xl font-bold", data.resumen.offline > 0 && "text-warning")}>{data.resumen.offline}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-serif">Sin dispositivo</span>
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{data.resumen.sin_dispositivo}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-serif">Alertas pendientes</span>
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className={cn("text-2xl font-bold", data.resumen.alertas_pendientes > 0 && "text-warning")}>{data.resumen.alertas_pendientes}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-serif">Críticas</span>
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className={cn("text-2xl font-bold", data.resumen.alertas_criticas > 0 && "text-error")}>{data.resumen.alertas_criticas}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-serif">Actuadores pendientes</span>
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className={cn("text-2xl font-bold", data.resumen.actuadores_pendientes > 0 && "text-warning")}>{data.resumen.actuadores_pendientes}</p>
            </div>
          </div>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Estado por locker</CardTitle>
                <CardDescription className="font-serif">
                  Conectividad del dispositivo, lectura más reciente de sensores y alertas pendientes
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground font-serif flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Actualizado: {formatoFecha(lastUpdated)}
                  </span>
                )}
                <Button onClick={fetchMonitoreo} variant="outline" className="h-9">
                  <RefreshCw className="w-4 h-4" />
                  Recargar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar por locker o edificio..."
                className="pl-10 font-serif h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {lockers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Locker</TableHead>
                    <TableHead className="font-semibold">Conectividad</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Actuador</TableHead>
                    <TableHead className="font-semibold">Alertas</TableHead>
                    <TableHead className="font-semibold">Última señal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lockers.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{l.identificador}</p>
                            <p className="text-xs text-muted-foreground font-serif">
                              {l.edificio ?? "—"} · Piso {l.piso ?? "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(l.online ? "bg-available/10 text-available border-available/20" : l.device_id ? "bg-warning/10 text-warning border-warning/20" : "bg-muted text-muted-foreground border-border")}>
                          {l.online ? "En línea" : l.device_id ? "Fuera de línea" : "Sin dispositivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{l.estado}</TableCell>
                      <TableCell>
                        {l.actuador.pendientes > 0 ? (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            Pendiente: {l.actuador.pendientes} abrir
                          </Badge>
                        ) : l.actuador.ultimo ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                            {l.actuador.ultimo.accion} · {formatoFecha(l.actuador.ultimo.creado_en)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {l.alertas.pendientes > 0 ? (
                          <Badge variant="outline" className={cn(l.alertas.criticas > 0 ? "bg-error/10 text-error border-error/20" : "bg-warning/10 text-warning border-warning/20")}>
                            {l.alertas.pendientes} pendiente{l.alertas.pendientes > 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-serif text-sm">
                        {formatoFecha(l.last_seen)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay lockers para mostrar.
              </p>
            )}

            {/* Enlaces a vistas detalladas */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/dashboard/iot" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Estado IoT <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link to="/dashboard/lockers-estado" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Estado de Lockers <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link to="/dashboard/alertas" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Alertas IoT <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
