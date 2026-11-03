import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/admin/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Thermometer,
  Activity,
  DoorOpen,
  Droplets,
  Sun,
  Clock,
  Loader2,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fastFetch } from "@/api/apiConfig"

interface Lectura {
  locker_id: number
  identificador: string
  sensor: string
  valor: number
  unidad: string | null
  created_at: string | null
}

interface ComandosRespuesta {
  locker_id: number
  resumen: { pendientes: number; ejecutados: number }
  comandos: { id: number; accion: string; ejecutado: boolean; creado_en: string | null }[]
}

const sensorConfig: Record<string, { label: string; icon: any }> = {
  temperatura: { label: "Temperatura", icon: Thermometer },
  vibracion: { label: "Vibración", icon: Activity },
  puerta_abierta: { label: "Puerta abierta", icon: DoorOpen },
  humedad: { label: "Humedad", icon: Droplets },
  iluminacion: { label: "Iluminación", icon: Sun },
}

// Umbrales para marcar lecturas fuera de rango (coinciden con el backend)
const esAlerta = (sensor: string, valor: number) => {
  switch (sensor) {
    case "temperatura": return valor < 10 || valor > 40
    case "vibracion": return valor > 500
    case "puerta_abierta": return Number(valor) >= 1
    default: return false
  }
}

const formatoFecha = (iso: string | null) => {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" })
}

export default function SensorMonitoringPage() {
  const [lecturas, setLecturas] = useState<Lectura[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [expandedLocker, setExpandedLocker] = useState<number | null>(null)
  const [comandos, setComandos] = useState<Record<number, ComandosRespuesta>>({})

  const fetchLecturas = useCallback(async () => {
    try {
      const res = await fastFetch("/iot/sensors/latest")
      if (!res.ok) {
        setError("No se pudo cargar las lecturas de sensores (error " + res.status + ")")
        return
      }
      const json = await res.json()
      setLecturas(json.lecturas ?? [])
      setError(null)
      setLastUpdated(new Date().toISOString())
    } catch (e) {
      console.error("Error cargando lecturas de sensores:", e)
      setError("Error de red al consultar las lecturas de sensores")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLecturas()
    const interval = setInterval(fetchLecturas, 30000)
    return () => clearInterval(interval)
  }, [fetchLecturas])

  const toggleComandos = async (lockerId: number) => {
    if (expandedLocker === lockerId) {
      setExpandedLocker(null)
      return
    }
    setExpandedLocker(lockerId)
    if (comandos[lockerId]) return
    try {
      const res = await fastFetch(`/iot/commands/${lockerId}`)
      if (res.ok) {
        const json: ComandosRespuesta = await res.json()
        setComandos((prev) => ({ ...prev, [lockerId]: json }))
      }
    } catch (e) {
      console.error("Error cargando comandos de actuadores:", e)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando lecturas de sensores...</p>
      </div>
    )
  }

  // Agrupar lecturas por locker
  const porLocker = lecturas.reduce<Record<number, { identificador: string; lecturas: Lectura[] }>>(
    (acc, l) => {
      if (!acc[l.locker_id]) acc[l.locker_id] = { identificador: l.identificador ?? `Locker ${l.locker_id}`, lecturas: [] }
      acc[l.locker_id].lecturas.push(l)
      return acc
    },
    {}
  )

  const lockers = Object.entries(porLocker).filter(([, g]) =>
    g.identificador.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAlertas = lecturas.filter(l => esAlerta(l.sensor, Number(l.valor))).length

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Monitoreo de Sensores"
        description="Lecturas más recientes de sensores y comandos de actuadores por locker"
      />

      <div className="flex-1 p-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-error/40 bg-error/10 p-4 text-error text-sm">
            {error}
          </div>
        )}

        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-serif">Lockers reportando</span>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{lockers.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-serif">Lecturas activas</span>
              <Thermometer className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{lecturas.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-serif">Lecturas fuera de rango</span>
              <DoorOpen className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className={cn("text-2xl font-bold", totalAlertas > 0 && "text-warning")}>{totalAlertas}</p>
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Lecturas de sensores</CardTitle>
                <CardDescription className="font-serif">
                  Último valor de cada sensor por locker; expande un locker para ver sus comandos de actuadores
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground font-serif flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Actualizado: {formatoFecha(lastUpdated)}
                  </span>
                )}
                <button
                  onClick={fetchLecturas}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recargar
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar por locker..."
                className="pl-10 font-serif h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {lockers.length > 0 ? lockers.map(([lockerId, grupo]) => (
              <div key={lockerId} className="mb-6 rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">
                        <span className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          {grupo.identificador}
                        </span>
                      </TableHead>
                      <TableHead className="font-semibold">Sensor</TableHead>
                      <TableHead className="font-semibold">Valor</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold">Registrado</TableHead>
                      <TableHead className="font-semibold w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grupo.lecturas.map((l) => {
                      const conf = sensorConfig[l.sensor] ?? { label: l.sensor, icon: Activity }
                      const alerta = esAlerta(l.sensor, Number(l.valor))
                      const Icone = conf.icon
                      return (
                        <TableRow key={`${l.locker_id}-${l.sensor}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Icone className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-sm">{conf.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{Number(l.valor)}</span>
                            {l.unidad && (
                              <span className="text-xs text-muted-foreground ml-1">{l.unidad}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(alerta ? "bg-warning/10 text-warning border-warning/20" : "bg-available/10 text-available border-available/20")}>
                              {alerta ? "Fuera de rango" : "Normal"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-serif text-sm">
                            {formatoFecha(l.created_at)}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => toggleComandos(Number(lockerId))}
                              className="text-muted-foreground hover:text-foreground"
                              title="Ver comandos de actuadores"
                            >
                              {expandedLocker === Number(lockerId) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {/* Comandos de actuadores del locker */}
                {expandedLocker === Number(lockerId) && (
                  <div className="border-t border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Unlock className="w-4 h-4" />
                        Comandos de actuadores — {grupo.identificador}
                      </h4>
                      {comandos[Number(lockerId)] && (
                        <span className="text-xs text-muted-foreground font-serif">
                          {comandos[Number(lockerId)].resumen.pendientes} pendientes · {comandos[Number(lockerId)].resumen.ejecutados} ejecutados
                        </span>
                      )}
                    </div>
                    {comandos[Number(lockerId)] ? (
                      comandos[Number(lockerId)].comandos.length > 0 ? (
                        <ul className="space-y-1">
                          {comandos[Number(lockerId)].comandos.map((c) => (
                            <li key={c.id} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className={cn(c.ejecutado ? "bg-available/10 text-available border-available/20" : "bg-warning/10 text-warning border-warning/20")}>
                                {c.ejecutado ? "Ejecutado" : "Pendiente"}
                              </Badge>
                              <span className="capitalize">{c.accion}</span>
                              <span className="text-xs text-muted-foreground font-serif">{formatoFecha(c.creado_en)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin comandos registrados.</p>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Cargando comandos...
                      </p>
                    )}
                  </div>
                )}
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-8">
                No hay lecturas de sensores registradas todavía.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
