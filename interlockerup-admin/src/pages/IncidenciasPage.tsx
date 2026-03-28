import { useState, useEffect } from "react"
import { Header } from "@/components/admin/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  MoreHorizontal,
  Eye,
  MessageSquare,
  Filter,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle,
  Loader2,
  Calendar,
  Box,
  User,
  FileCheck,
} from "lucide-react"
import { StatsCard } from "@/components/admin/stats-card"
import { cn } from "@/lib/utils"

const statusConfig = {
  pendiente: { label: "Pendiente", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  en_proceso: { label: "En proceso", color: "bg-secondary/10 text-secondary border-secondary/20", icon: Loader2 },
  resuelto: { label: "Resuelto", color: "bg-available/10 text-available border-available/20", icon: CheckCircle },
}

const priorityConfig = {
  alta: { label: "Alta", color: "bg-error text-white" },
  media: { label: "Media", color: "bg-warning text-white" },
  baja: { label: "Baja", color: "bg-available text-white" },
}

export default function IncidenciasPage() {
  const [incidents, setIncidents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null)
  const [newComment, setNewComment] = useState("")
  const [newStatus, setNewStatus] = useState("")

  // --- 1. CARGAR INCIDENCIAS DESDE LA BD ---
  const fetchIncidents = async () => {
    try {
      const res = await fetch('https://admin.vigilia.world/api/incidents/admin');
      const data = await res.json();
      
      // Mapeamos los datos de la base de datos al formato de tu UI
      const formatted = data.map((item: any) => {
        // Parsear comentarios guardados como JSON en la base de datos
        let parsedComments = [];
        try { parsedComments = JSON.parse(item.observaciones_admin || "[]"); } 
        catch(e) { parsedComments = []; }

        // Traducir estados de BD a UI
        const uiStatus = item.estado === 'en proceso' ? 'en_proceso' : item.estado === 'resuelta' ? 'resuelto' : 'pendiente';
        
        // Asignar prioridad basada en la categoría
        const priority = item.categoria === 'damage' ? 'alta' : item.categoria === 'access' ? 'media' : 'baja';

        return {
          id: item.id,
          folio: item.folio,
          locker: item.locker_name,
          location: item.location || 'Ubicación General',
          description: item.descripcion,
          status: uiStatus,
          priority: priority,
          reportedBy: { name: item.user_name, matricula: item.matricula },
          reportedAt: item.fecha_reporte,
          comments: parsedComments,
          evidencia_url: item.evidencia_url,
          archivo_hash: item.archivo_hash
        };
      });

      setIncidents(formatted);
    } catch (error) {
      console.error("Error cargando incidencias:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchIncidents();
  }, [])

  // --- 2. CAMBIAR ESTADO DESDE EL MENÚ RÁPIDO ---
  const handleChangeStatus = async (incidentId: number, status: string) => {
    try {
      const res = await fetch(`https://admin.vigilia.world/api/incidents/admin/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: status })
      });
      if(res.ok) {
        fetchIncidents(); // Recargamos la tabla
      }
    } catch (e) { console.error(e) }
  }

  // --- 3. AGREGAR COMENTARIO Y ESTADO ---
  const handleAddComment = async () => {
    if (!selectedIncident) return
    
    try {
      const res = await fetch(`https://admin.vigilia.world/api/incidents/admin/${selectedIncident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estado: newStatus || selectedIncident.status, 
          nuevo_comentario: newComment 
        })
      });
      if(res.ok) {
        await fetchIncidents();
        setNewComment("")
        setNewStatus("")
        setIsCommentDialogOpen(false)
        setIsDetailDialogOpen(false)
      }
    } catch (e) { console.error(e) }
  }

  const openDetailDialog = (incident: any) => {
    setSelectedIncident(incident)
    setIsDetailDialogOpen(true)
  }

  const openCommentDialog = (incident: any) => {
    setSelectedIncident(incident)
    setNewStatus(incident.status)
    setIsCommentDialogOpen(true)
  }

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.locker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.reportedBy.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || incident.status === filterStatus
    const matchesPriority = filterPriority === "all" || incident.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  const totalPendiente = incidents.filter((i) => i.status === "pendiente").length
  const totalEnProceso = incidents.filter((i) => i.status === "en_proceso").length
  const totalResuelto = incidents.filter((i) => i.status === "resuelto").length

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando incidencias y evidencias...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Gestion de Incidencias"
        description="Visualiza y gestiona las incidencias del sistema"
      />

      <div className="flex-1 p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Total Incidencias"
            value={incidents.length}
            description="Registradas en el sistema"
            icon={AlertTriangle}
          />
          <StatsCard
            title="Pendientes"
            value={totalPendiente}
            description="Requieren atencion"
            icon={Clock}
            variant="warning"
          />
          <StatsCard
            title="En Proceso"
            value={totalEnProceso}
            description="Siendo atendidas"
            icon={Loader2}
          />
          <StatsCard
            title="Resueltas"
            value={totalResuelto}
            description="Histórico"
            icon={CheckCircle}
            variant="available"
          />
        </div>

        {/* Incidents Table Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Lista de Incidencias</CardTitle>
                <CardDescription className="font-serif">
                  Seguimiento y resolucion de problemas reportados
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por locker, descripcion o usuario..."
                  className="pl-10 font-serif"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-44">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_proceso">En proceso</SelectItem>
                    <SelectItem value="resuelto">Resuelto</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Folio</TableHead>
                    <TableHead className="font-semibold">Locker</TableHead>
                    <TableHead className="font-semibold">Descripcion</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Prioridad</TableHead>
                    <TableHead className="font-semibold">Reportado por</TableHead>
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.length > 0 ? filteredIncidents.map((incident) => {
                    const config = statusConfig[incident.status as keyof typeof statusConfig]
                    const priorityConf = priorityConfig[incident.priority as keyof typeof priorityConfig]
                    const StatusIcon = config.icon
                    return (
                      <TableRow key={incident.id}>
                        <TableCell className="font-mono text-xs">{incident.folio}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Box className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium">{incident.locker}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-serif line-clamp-2 max-w-xs">
                            {incident.description}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={config.color}>
                            <StatusIcon className={cn("w-3 h-3 mr-1", incident.status === "en_proceso" && "animate-spin")} />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityConf.color}>
                            {priorityConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{incident.reportedBy.name}</p>
                            <p className="text-xs text-muted-foreground font-serif">
                              {incident.reportedBy.matricula}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-serif text-sm">
                          {incident.reportedAt}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetailDialog(incident)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openCommentDialog(incident)}>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Agregar comentario
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleChangeStatus(incident.id, "en_proceso")}
                                disabled={incident.status === "en_proceso"}
                              >
                                <Loader2 className="w-4 h-4 mr-2" />
                                Marcar en proceso
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleChangeStatus(incident.id, "resuelto")}
                                disabled={incident.status === "resuelto"}
                                className="text-available"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marcar resuelto
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  }) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No se encontraron incidencias.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination info */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground font-serif">
                Mostrando {filteredIncidents.length} de {incidents.length} incidencias
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Incidencia {selectedIncident?.folio}</DialogTitle>
            <DialogDescription className="font-serif">
              Informacion completa de la incidencia
            </DialogDescription>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-6 py-4">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Locker</Label>
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{selectedIncident.locker}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Ubicacion</Label>
                  <p className="font-serif">{selectedIncident.location}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Reportado por</Label>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedIncident.reportedBy.name}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Fecha de reporte</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-serif">{selectedIncident.reportedAt}</span>
                  </div>
                </div>
              </div>

              {/* Status & Priority */}
              <div className="flex items-center gap-4">
                <Badge
                  variant="outline"
                  className={statusConfig[selectedIncident.status as keyof typeof statusConfig].color}
                >
                  {statusConfig[selectedIncident.status as keyof typeof statusConfig].label}
                </Badge>
                <Badge className={priorityConfig[selectedIncident.priority as keyof typeof priorityConfig].color}>
                  Prioridad {priorityConfig[selectedIncident.priority as keyof typeof priorityConfig].label}
                </Badge>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Descripcion</Label>
                <p className="font-serif bg-muted/50 p-4 rounded-lg">{selectedIncident.description}</p>
              </div>

              {/* EVIDENCIA Y HASH (REQUISITO RÚBRICA) */}
              {selectedIncident.evidencia_url && (
                <div className="p-4 border border-dashed border-[#2fa4a9]/50 rounded-xl bg-[#2fa4a9]/5 space-y-4">
                  <div className="flex items-center gap-2 text-[#2fa4a9]">
                    <FileCheck className="w-5 h-5" />
                    <Label className="font-semibold text-current">Evidencia</Label>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="shrink-0">
                      <Label className="text-xs text-muted-foreground mb-2 block">Fotografía Original</Label>
                      {/* Node.js estático expone la carpeta uploads */}
                      <img 
                        src={`https://admin.vigilia.world/${selectedIncident.evidencia_url.replace('\\', '/')}`} 
                        alt="Evidencia del alumno" 
                        className="w-40 h-40 object-cover rounded-lg shadow-md border border-[#e2e8f0]"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    
                    <div className="flex-1 space-y-2 w-full">
                      <Label className="text-xs text-muted-foreground">Firma Criptográfica SHA-256:</Label>
                      <div className="bg-white p-3 rounded-lg border border-[#e2e8f0] shadow-inner">
                        <p className="font-mono text-sm text-[#0b4dbb] break-all leading-relaxed">
                          {selectedIncident.archivo_hash || "No se generó hash para este archivo."}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground font-serif mt-2">
                        * Este Hash asegura que la imagen no ha sido alterada desde que el alumno la subió desde su dispositivo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs">
                  Historial de Atención ({selectedIncident.comments.length})
                </Label>
                {selectedIncident.comments.length > 0 ? (
                  <div className="space-y-3">
                    {selectedIncident.comments.map((comment: any, index: number) => (
                      <div key={index} className="bg-muted/50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{comment.author}</span>
                          <span className="text-xs text-muted-foreground font-serif">{comment.date}</span>
                        </div>
                        <p className="font-serif text-sm">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground font-serif">No hay comentarios registrados.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => { setIsDetailDialogOpen(false); if (selectedIncident) openCommentDialog(selectedIncident); }}>
              Actualizar Incidencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Incidencia</DialogTitle>
            <DialogDescription className="font-serif">
              Incidencia {selectedIncident?.folio} - Locker {selectedIncident?.locker}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cambiar Estado</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Mantener estado actual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_proceso">En proceso</SelectItem>
                  <SelectItem value="resuelto">Resuelto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agregar Comentario u Observación</Label>
              <Textarea
                placeholder="Ej. El técnico acudió a revisar la chapa magnética..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                className="font-serif"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddComment}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}