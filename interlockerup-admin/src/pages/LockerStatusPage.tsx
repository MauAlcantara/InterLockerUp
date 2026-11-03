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
  Box,
  Clock,
  Loader2,
  User,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fastFetch } from "@/api/apiConfig"

interface Locker {
  id: number
  identificador: string
  estado: string
  ubicacion_detallada: string | null
  floor: string | null
  edificio: string | null
  updated_at: string | null
  usuario: string | null
  fecha_vencimiento: string | null
}

interface EstadoLockers {
  resumen: Record<string, number>
  lockers: Locker[]
}

const estadoConfig: Record<string, { label: string; color: string }> = {
  disponible: { label: "Disponible", color: "bg-available/10 text-available border-available/20" },
  ocupado: { label: "Ocupado", color: "bg-primary/10 text-primary border-primary/20" },
  mantenimiento: { label: "Mantenimiento", color: "bg-warning/10 text-warning border-warning/20" },
  bloqueado: { label: "Bloqueado", color: "bg-error/10 text-error border-error/20" },
  proceso: { label: "En proceso", color: "bg-secondary/10 text-secondary border-secondary/20" },
}

const formatoFecha = (iso: string | null) => {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" })
}

export default function LockerStatusPage() {
  const [data, setData] = useState<EstadoLockers | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState("all")
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchEstado = useCallback(async () => {
    try {
      const res = await fastFetch("/lockers/admin/status")
      if (!res.ok) {
        setError("No se pudo cargar el estado de los lockers (error " + res.status + ")")
        return
      }
      const json: EstadoLockers = await res.json()
      setData(json)
      setError(null)
      setLastUpdated(new Date().toISOString())
    } catch (e) {
      console.error("Error cargando estado de lockers:", e)
      setError("Error de red al consultar el estado de los lockers")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEstado()
    const interval = setInterval(fetchEstado, 30000)
    return () => clearInterval(interval)
  }, [fetchEstado])

  const lockers = data?.lockers ?? []
  const resumen = data?.resumen ?? {}

  const filtered = lockers.filter((l) => {
    const matchesSearch =
      l.identificador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.usuario ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.edificio ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterEstado === "all" || l.estado === filterEstado
    return matchesSearch && matchesFilter
  })

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando estado de los lockers...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Estado de Lockers"
        description="Estado actual de cada locker del sistema"
      />

      <div className="flex-1 p-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-error/40 bg-error/10 p-4 text-error text-sm">
            {error}
          </div>
        )}

        {/* Resumen por estado */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(estadoConfig).map(([estado, conf]) => (
            <div key={estado} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-serif">{conf.label}</span>
                <Box className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{resumen[estado] ?? 0}</p>
            </div>
          ))}
        </div>

        {/* Tabla de lockers */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Lockers del sistema</CardTitle>
                <CardDescription className="font-serif">
                  Estado, usuario asignado y ubicación de cada locker
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
                  onClick={fetchEstado}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recargar
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Buscar por locker, usuario o edificio..."
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
                <option value="all">Todos los estados</option>
                {Object.entries(estadoConfig).map(([estado, conf]) => (
                  <option key={estado} value={estado}>{conf.label}</option>
                ))}
              </select>
            </div>

            {/* Tabla */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Locker</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Usuario</TableHead>
                    <TableHead className="font-semibold">Ubicación</TableHead>
                    <TableHead className="font-semibold">Actualizado</TableHead>
                    <TableHead className="font-semibold">Vencimiento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? filtered.map((l) => {
                    const conf = estadoConfig[l.estado] ?? { label: l.estado, color: "bg-muted/10 text-muted-foreground border-muted/20" }
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Box className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium">{l.identificador}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(conf.color)}>
                            {conf.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {l.usuario ? (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{l.usuario}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-serif">
                          {l.edificio ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {l.edificio}{l.floor ? ` · Piso ${l.floor}` : ""}
                            </div>
                          ) : l.ubicacion_detallada ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-serif text-sm">
                          {formatoFecha(l.updated_at)}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-serif text-sm">
                          {formatoFecha(l.fecha_vencimiento)}
                        </TableCell>
                      </TableRow>
                    )
                  }) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No se encontraron lockers.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground font-serif">
                Mostrando {filtered.length} de {lockers.length} lockers
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
