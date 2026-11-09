import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/admin/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  Wifi,
  WifiOff,
  Cpu,
  Clock,
  Loader2,
} from "lucide-react"
import { StatsCard } from "@/components/admin/stats-card"
import { fastFetch } from "@/api/apiConfig"

interface Dispositivo {
  locker_id: number
  identificador: string
  device_id: string | null
  estado: string | null
  last_seen: string | null
  firmware: string | null
  online: boolean
}

interface EstadoIoT {
  resumen: {
    total_lockers: number
    con_dispositivo: number
    online: number
    offline: number
    sin_dispositivo: number
  }
  dispositivos: Dispositivo[]
}

const formatoFecha = (iso: string | null) => {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" })
}

export default function IotStatusPage() {
  const [data, setData] = useState<EstadoIoT | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState("all")
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fastFetch("/iot/status")
      if (!res.ok) {
        setError("No se pudo cargar el estado IoT (error " + res.status + ")")
        return
      }
      const json: EstadoIoT = await res.json()
      setData(json)
      setError(null)
      setLastUpdated(new Date().toISOString())
    } catch (e) {
      console.error("Error cargando estado IoT:", e)
      setError("Error de red al consultar el estado IoT")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
    // Refresco automático cada 30 segundos
    const interval = setInterval(() => { void fetchStatus() }, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const dispositivos = data?.dispositivos ?? []

  const filtered = dispositivos.filter((d) => {
    const matchesSearch =
      d.identificador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.device_id ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    const categoria = d.device_id === null ? "sin_dispositivo" : d.online ? "online" : "offline"
    const matchesFilter = filterEstado === "all" || categoria === filterEstado
    return matchesSearch && matchesFilter
  })

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando estado de conectividad IoT...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Estado IoT"
        description="Estado de conectividad de los dispositivos IoT por locker"
      />

      <div className="flex-1 p-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-error/40 bg-error/10 p-4 text-error text-sm">
            {error}
          </div>
        )}

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Lockers"
            value={data?.resumen.total_lockers ?? 0}
            description="Total en el sistema"
            icon={Cpu}
          />
          <StatsCard
            title="En línea"
            value={data?.resumen.online ?? 0}
            description="Dispositivos con señal activa"
            icon={Wifi}
            variant="available"
          />
          <StatsCard
            title="Fuera de línea"
            value={data?.resumen.offline ?? 0}
            description="Sin señal reciente"
            icon={WifiOff}
            variant="warning"
          />
          <StatsCard
            title="Sin dispositivo"
            value={data?.resumen.sin_dispositivo ?? 0}
            description="Lockers sin ESP32 asignado"
            icon={Cpu}
          />
        </div>

        {/* Tabla de dispositivos */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Dispositivos por locker</CardTitle>
                <CardDescription className="font-serif">
                  Conectividad y última señal de cada ESP32
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground font-serif flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Actualizado: {formatoFecha(lastUpdated)}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={fetchStatus}>
                  <RefreshCw className="w-4 h-4" />
                  Recargar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Buscar por locker o dispositivo..."
                  className="pl-10 font-serif h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-48"
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="online">En línea</option>
                <option value="offline">Fuera de línea</option>
                <option value="sin_dispositivo">Sin dispositivo</option>
              </select>
            </div>

            {/* Tabla */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Locker</TableHead>
                    <TableHead className="font-semibold">Dispositivo</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Última señal</TableHead>
                    <TableHead className="font-semibold">Firmware</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? filtered.map((d) => (
                    <TableRow key={d.locker_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Cpu className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">{d.identificador}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {d.device_id ? (
                          <span className="font-mono text-xs">{d.device_id}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin dispositivo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.device_id === null ? (
                          <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-muted/20">
                            Sin dispositivo
                          </Badge>
                        ) : d.online ? (
                          <Badge variant="outline" className="bg-available/10 text-available border-available/20">
                            <Wifi className="w-3 h-3 mr-1" />
                            En línea
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            <WifiOff className="w-3 h-3 mr-1" />
                            Fuera de línea
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-serif text-sm">
                        {formatoFecha(d.last_seen)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {d.firmware ?? "—"}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No se encontraron dispositivos.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground font-serif">
                Mostrando {filtered.length} de {dispositivos.length} lockers
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
