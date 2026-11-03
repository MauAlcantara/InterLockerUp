import { useState, useEffect, useCallback } from "react"
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
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fastFetch } from "@/api/apiConfig"

interface Alerta {
  id: number
  locker_id: number
  identificador: string | null
  tipo: string
  severidad: "warning" | "critical"
  mensaje: string | null
  resuelta: boolean
  created_at: string | null
}

interface RespuestaAlertas {
  resumen: { total: number; resueltas: number; pendientes: number; criticas: number }
  alertas: Alerta[]
}

const tipoConfig: Record<string, string> = {
  temperatura: "Temperatura",
  vibracion: "Vibración",
  puerta_abierta: "Puerta abierta",
  fuera_de_linea: "Fuera de línea",
}

const formatoFecha = (iso: string | null) => {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" })
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [resumen, setResumen] = useState<RespuestaAlertas["resumen"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filtro, setFiltro] = useState<"false" | "true" | "all">("false")
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [resolviendo, setResolviendo] = useState<number | null>(null)

  const fetchAlertas = useCallback(async () => {
    try {
      const res = await fastFetch(`/iot/alerts?resueltas=${filtro}`)
      if (!res.ok) {
        setError("No se pudo cargar las alertas (error " + res.status + ")")
        return
      }
      const json: RespuestaAlertas = await res.json()
      setAlertas(json.alertas ?? [])
      setResumen(json.resumen ?? null)
      setError(null)
      setLastUpdated(new Date().toISOString())
    } catch (e) {
      console.error("Error cargando alertas:", e)
      setError("Error de red al consultar las alertas")
    } finally {
      setIsLoading(false)
    }
  }, [filtro])

  useEffect(() => {
    fetchAlertas()
    const interval = setInterval(fetchAlertas, 30000)
    return () => clearInterval(interval)
  }, [fetchAlertas])

  const resolver = async (id: number) => {
    setResolviendo(id)
    try {
      const res = await fastFetch(`/iot/alerts/${id}/resolve`, { method: "POST" })
      if (!res.ok) {
        setError("No se pudo resolver la alerta (error " + res.status + ")")
        return
      }
      await fetchAlertas()
    } catch (e) {
      console.error("Error resolviendo alerta:", e)
      setError("Error de red al resolver la alerta")
    } finally {
      setResolviendo(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando alertas...</p>
      </div>
    )
  }

  const filtradas = alertas.filter(a =>
    (a.identificador ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.mensaje ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Alertas IoT"
        description="Alertas generadas por umbrales de sensores y pérdida de conexión de los dispositivos"
      />

      <div className="flex-1 p-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-error/40 bg-error/10 p-4 text-error text-sm">
            {error}
          </div>
        )}

        {/* Resumen */}
        {resumen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-serif">Alertas (vista actual)</span>
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{resumen.total}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-serif">Pendientes</span>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className={cn("text-2xl font-bold", resumen.pendientes > 0 && "text-warning")}>{resumen.pendientes}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-serif">Resueltas</span>
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-available">{resumen.resueltas}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-serif">Críticas</span>
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className={cn("text-2xl font-bold", resumen.criticas > 0 && "text-error")}>{resumen.criticas}</p>
            </div>
          </div>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Alertas</CardTitle>
                <CardDescription className="font-serif">
                  Las alertas críticas requieren atención inmediata; márcalas como resueltas al atenderlas
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground font-serif flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Actualizado: {formatoFecha(lastUpdated)}
                  </span>
                )}
                <select
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value as "false" | "true" | "all")}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="false">Pendientes</option>
                  <option value="true">Resueltas</option>
                  <option value="all">Todas</option>
                </select>
                <Button
                  onClick={fetchAlertas}
                  variant="outline"
                  className="h-9"
                >
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
                placeholder="Buscar por locker, tipo o mensaje..."
                className="pl-10 font-serif h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filtradas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Locker</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Severidad</TableHead>
                    <TableHead className="font-semibold">Mensaje</TableHead>
                    <TableHead className="font-semibold">Registrada</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{a.identificador ?? `Locker ${a.locker_id}`}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{tipoConfig[a.tipo] ?? a.tipo}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(a.severidad === "critical" ? "bg-error/10 text-error border-error/20" : "bg-warning/10 text-warning border-warning/20")}>
                          {a.severidad === "critical" ? "Crítica" : "Advertencia"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate" title={a.mensaje ?? ""}>
                        {a.mensaje ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-serif text-sm">
                        {formatoFecha(a.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(a.resuelta ? "bg-available/10 text-available border-available/20" : "bg-warning/10 text-warning border-warning/20")}>
                          {a.resuelta ? "Resuelta" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!a.resuelta && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resolver(a.id)}
                            disabled={resolviendo === a.id}
                          >
                            {resolviendo === a.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            Resolver
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay alertas {filtro === "false" ? "pendientes" : filtro === "true" ? "resueltas" : ""} para mostrar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
