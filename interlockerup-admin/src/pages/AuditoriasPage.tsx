import { useState, useEffect } from "react"
import { Header } from "@/components/admin/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search, Download, FileText, Calendar, Box, LogIn, LogOut, 
  UserPlus, UserMinus, AlertTriangle, Settings, Key, Clock, Loader2
} from "lucide-react"
import { StatsCard } from "@/components/admin/stats-card"
import { cn } from "@/lib/utils"

// Acciones estáticas del sistema que no tienen tabla en BD
const systemLogsStatic = [
  { id: 1, action: "usuario_creado", description: "Nuevo usuario registrado: Juan Garcia", performedBy: "Admin UTEQ", date: "2026-02-03 10:00:00", ip: "192.168.1.100" },
  { id: 2, action: "usuario_desactivado", description: "Usuario desactivado: Pedro Sanchez", performedBy: "Admin UTEQ", date: "2026-02-02 15:30:00", ip: "192.168.1.100" },
  { id: 3, action: "locker_bloqueado", description: "Locker B-202 bloqueado por mantenimiento", performedBy: "Admin UTEQ", date: "2026-02-01 11:00:00", ip: "192.168.1.100" },
  { id: 4, action: "config_modificada", description: "Configuracion del sistema actualizada", performedBy: "Admin UTEQ", date: "2026-01-30 10:00:00", ip: "192.168.1.100" },
]

const actionIcons = {
  acceso: LogIn,
  acceso_denegado: Key,
  asignacion: UserPlus,
  liberacion: UserMinus,
  usuario_creado: UserPlus,
  usuario_desactivado: UserMinus,
  locker_bloqueado: Box,
  incidencia_resuelta: AlertTriangle,
  login: LogIn,
  logout: LogOut,
  config_modificada: Settings,
}

const actionColors = {
  acceso: "bg-available/10 text-available",
  acceso_denegado: "bg-error/10 text-error",
  asignacion: "bg-secondary/10 text-secondary",
  liberacion: "bg-warning/10 text-warning",
  usuario_creado: "bg-available/10 text-available",
  usuario_desactivado: "bg-error/10 text-error",
  locker_bloqueado: "bg-warning/10 text-warning",
  incidencia_resuelta: "bg-available/10 text-available",
  login: "bg-primary/10 text-primary",
  logout: "bg-muted text-muted-foreground",
  config_modificada: "bg-secondary/10 text-secondary",
}

const statusColors = {
  pendiente: "bg-warning/10 text-warning border-warning/20",
  en_proceso: "bg-secondary/10 text-secondary border-secondary/20",
  resuelto: "bg-available/10 text-available border-available/20",
  resuelta: "bg-available/10 text-available border-available/20",
}

export default function AuditoriasPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDate, setFilterDate] = useState("all")
  const [activeTab, setActiveTab] = useState("accesos")

  // Estados dinámicos
  const [accessLogs, setAccessLogs] = useState<any[]>([])
  const [assignmentLogs, setAssignmentLogs] = useState<any[]>([])
  const [incidentLogs, setIncidentLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/audits');
        if (res.ok) {
          const data = await res.json();
          setAccessLogs(data.accessLogs);
          setAssignmentLogs(data.assignmentLogs);
          setIncidentLogs(data.incidentLogs);
        }
      } catch (error) {
        console.error("Error fetching audits:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAudits();
  }, []);

  const totalAccesos = accessLogs.length
  const totalAsignaciones = assignmentLogs.filter((a) => a.action === "asignacion").length
  const totalLiberaciones = assignmentLogs.filter((a) => a.action === "liberacion").length

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Generando reportes de auditoría...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Auditorias y Reportes"
        description="Consulta el historial de actividades del sistema"
      />

      <div className="flex-1 p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Accesos Registrados"
            value={totalAccesos}
            description="Este mes"
            icon={LogIn}
          />
          <StatsCard
            title="Asignaciones"
            value={totalAsignaciones}
            description="Lockers asignados"
            icon={UserPlus}
            variant="available"
          />
          <StatsCard
            title="Liberaciones"
            value={totalLiberaciones}
            description="Lockers liberados"
            icon={UserMinus}
            variant="warning"
          />
          <StatsCard
            title="Acciones Sistema"
            value={systemLogsStatic.length}
            description="Registradas"
            icon={FileText}
          />
        </div>

        {/* Tabs for different audit sections */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Registros de Auditoria</CardTitle>
                <CardDescription className="font-serif">
                  Informacion historica del sistema (solo lectura)
                </CardDescription>
              </div>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar Reporte
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar en registros..."
                  className="pl-10 font-serif"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterDate} onValueChange={setFilterDate}>
                  <SelectTrigger className="w-44">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo el tiempo</SelectItem>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Esta semana</SelectItem>
                    <SelectItem value="month">Este mes</SelectItem>
                    <SelectItem value="year">Este año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="accesos">Accesos a Lockers</TabsTrigger>
                <TabsTrigger value="asignaciones">Asignaciones</TabsTrigger>
                <TabsTrigger value="sistema">Acciones del Sistema</TabsTrigger>
                <TabsTrigger value="incidencias">Incidencias</TabsTrigger>
              </TabsList>

              {/* Access Logs Tab */}
              <TabsContent value="accesos">
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Fecha/Hora</TableHead>
                        <TableHead className="font-semibold">Locker</TableHead>
                        <TableHead className="font-semibold">Usuario</TableHead>
                        <TableHead className="font-semibold">Accion</TableHead>
                        <TableHead className="font-semibold">Metodo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLogs.map((log) => {
                        const Icon = actionIcons[log.action as keyof typeof actionIcons] || Clock
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {log.date}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Box className="w-4 h-4 text-primary" />
                                <span className="font-medium">{log.locker || 'N/A'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{log.user || 'Desconocido'}</p>
                                <p className="text-sm text-muted-foreground font-serif">
                                  {log.matricula || '-'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm",
                                  actionColors[log.action as keyof typeof actionColors] || "bg-muted"
                                )}
                              >
                                <Icon className="w-3 h-3" />
                                {log.action === "acceso" ? "Acceso" : log.action}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground font-serif capitalize">
                              {log.method}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {accessLogs.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No hay registros de acceso aún.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Assignments Tab */}
              <TabsContent value="asignaciones">
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Fecha/Hora</TableHead>
                        <TableHead className="font-semibold">Locker</TableHead>
                        <TableHead className="font-semibold">Usuario</TableHead>
                        <TableHead className="font-semibold">Accion</TableHead>
                        <TableHead className="font-semibold">Realizado por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignmentLogs.map((log) => {
                        const Icon = actionIcons[log.action as keyof typeof actionIcons] || Clock
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {log.date}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Box className="w-4 h-4 text-primary" />
                                <span className="font-medium">{log.locker}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{log.user}</p>
                                <p className="text-sm text-muted-foreground font-serif">
                                  {log.matricula}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm",
                                  actionColors[log.action as keyof typeof actionColors]
                                )}
                              >
                                <Icon className="w-3 h-3" />
                                {log.action === "asignacion" ? "Asignacion" : "Liberacion"}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground font-serif">
                              {log.performedBy}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {assignmentLogs.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No hay asignaciones registradas.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* System Actions Tab */}
              <TabsContent value="sistema">
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Fecha/Hora</TableHead>
                        <TableHead className="font-semibold">Accion</TableHead>
                        <TableHead className="font-semibold">Descripcion</TableHead>
                        <TableHead className="font-semibold">Usuario</TableHead>
                        <TableHead className="font-semibold">IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {systemLogsStatic.map((log) => {
                        const Icon = actionIcons[log.action as keyof typeof actionIcons] || Settings
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {log.date}
                            </TableCell>
                            <TableCell>
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm",
                                  actionColors[log.action as keyof typeof actionColors]
                                )}
                              >
                                <Icon className="w-3 h-3" />
                                {log.action.replace("_", " ")}
                              </div>
                            </TableCell>
                            <TableCell className="font-serif max-w-xs">
                              {log.description}
                            </TableCell>
                            <TableCell className="font-medium">
                              {log.performedBy}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {log.ip}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Incidents Summary Tab */}
              <TabsContent value="incidencias">
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">ID</TableHead>
                        <TableHead className="font-semibold">Locker</TableHead>
                        <TableHead className="font-semibold">Descripcion</TableHead>
                        <TableHead className="font-semibold">Estado</TableHead>
                        <TableHead className="font-semibold">Reportado</TableHead>
                        <TableHead className="font-semibold">Resuelto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidentLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono">#{log.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Box className="w-4 h-4 text-primary" />
                              <span className="font-medium">{log.locker}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-serif max-w-xs">
                            {log.description}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusColors[log.status as keyof typeof statusColors]}
                            >
                              {log.status === "pendiente"
                                ? "Pendiente"
                                : log.status === "en_proceso"
                                ? "En proceso"
                                : "Resuelto"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-serif">{log.reportedAt}</p>
                              <p className="text-xs text-muted-foreground">{log.reportedBy}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-serif">
                            {log.status === "resuelto" ? log.reportedAt : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {incidentLogs.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No hay incidencias registradas.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground font-serif mt-4">
                  Nota: Esta vista es solo de consulta. Para gestionar incidencias, utiliza el modulo de Incidencias.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}