import { useState, useEffect } from "react"
import { Header } from "@/components/admin/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { BASE_URL } from "@/api/apiConfig"
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
  UserPlus,
  UserMinus,
  Wrench,
  Unlock,
  Building2,
  ChevronRight,
  ArrowLeft,
  Loader2,
  ClipboardList,
  CheckCircle,
  XCircle
} from "lucide-react"

// Tipos
type Locker = {
  id: string;
  identificador: string;
  numero: string;
  status: string;
  usuario: { nombre: string; matricula: string } | null;
}

type Edificio = {
  id: string;
  nombre: string;
  lockers: Locker[];
}

type Request = {
  id: number;
  locker_id: number;
  locker_identificador: string;
  usuario_nombre: string;
  usuario_matricula: string;
  shared: boolean;
  status: string;
  created_at: string;
}

export default function LockersPage() {
  const [edificios, setEdificios] = useState<Edificio[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedEdificio, setSelectedEdificio] = useState<Edificio | null>(null)
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isRequestsDialogOpen, setIsRequestsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState("")

  // --- 1. CARGAR DATOS DE LA BD ---
  const fetchLockers = async () => {
    try {
      const token = localStorage.getItem('admin_token');

      const res = await fetch(`${BASE_URL}/api/lockers/admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) return;

      const edificiosMap = new Map<string, Edificio>();
      
      data.forEach((row: any) => {
        const edifName = row.edificio || 'Edificio No Asignado';
        const edifCode = edifName; 
        
        if (!edificiosMap.has(edifCode)) {
          edificiosMap.set(edifCode, { id: edifCode, nombre: edifName, lockers: [] });
        }

        const lockerObj: Locker = {
          id: row.id ? row.id.toString() : Math.random().toString(),
          identificador: row.identificador,
          numero: row.identificador.includes('-') ? row.identificador.split('-')[1] : row.identificador,
          status: row.estado,
          usuario: row.matricula ? { nombre: row.nombre_completo, matricula: row.matricula } : null
        };

        edificiosMap.get(edifCode)?.lockers.push(lockerObj);
      });

      setEdificios(Array.from(edificiosMap.values()));

      if (selectedEdificio) {
        const updatedSelected = Array.from(edificiosMap.values()).find(e => e.id === selectedEdificio.id);
        if (updatedSelected) setSelectedEdificio(updatedSelected);
      }
    } catch (error) {
      console.error("Error crítico en fetchLockers:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${BASE_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const alumnos = data.filter((u: any) => (u.role === 'alumno' || u.role === 'estudiante') && u.status === 'activo');
        setAvailableUsers(alumnos);
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    }
  }

  // Cargar las solicitudes pendientes
  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      // Ajusta esta ruta a como la tengas en tu backend
      const res = await fetch(`${BASE_URL}/api/lockers/requests/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data);
      }
    } catch (error) {
      console.error("Error cargando solicitudes:", error);
    }
  }

  useEffect(() => {
    fetchLockers();
    fetchUsers();
    fetchRequests();
  }, [])

  // --- 2. ACCIONES DEL ADMINISTRADOR ---
  const handleAssignLocker = async () => {
    if (!selectedLocker || !selectedUser) return;
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${BASE_URL}/api/lockers/admin/assign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ locker_id: selectedLocker.id, matricula_usuario: selectedUser })
      });
      if (res.ok) {
        await fetchLockers(); 
        setIsAssignDialogOpen(false);
        setIsDetailDialogOpen(false);
        setSelectedLocker(null);
        setSelectedUser("");
      } else {
        alert("Error al asignar locker.");
      }
    } catch (e) { console.error(e) }
  }

  const handleReleaseLocker = async () => {
    if (!selectedLocker) return;
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${BASE_URL}/api/lockers/admin/${selectedLocker.id}/release`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchLockers();
        setIsDetailDialogOpen(false);
        setSelectedLocker(null);
      }
    } catch (e) { console.error(e) }
  }

  const handleChangeStatus = async (newStatus: string) => {
    if (!selectedLocker) return;
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${BASE_URL}/api/lockers/admin/${selectedLocker.id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nuevo_estado: newStatus })
      });
      if (res.ok) {
        await fetchLockers();
        setIsDetailDialogOpen(false);
        setSelectedLocker(null);
      }
    } catch (e) { console.error(e) }
  }

  // Procesar solicitud (Aprobar o Rechazar)
  const handleProcessRequest = async (id: number, action: 'approve' | 'reject') => {
    try {
      const token = localStorage.getItem('admin_token');
      // Ajusta la ruta según tu backend
      const res = await fetch(`${BASE_URL}/api/lockers/requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchRequests(); // Refresca la tabla de solicitudes
        await fetchLockers();  // Refresca los estados de los lockers
        if (pendingRequests.length === 1) setIsRequestsDialogOpen(false); // Cierra si era la última
      } else {
        alert(`Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} la solicitud.`);
      }
    } catch (error) {
      console.error(error);
    }
  }

  // --- HELPERS VISUALES ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case "disponible": return "bg-[#2fa4a9]"
      case "ocupado": return "bg-[#c94a4a]"
      case "mantenimiento": return "bg-[#f2b705]"
      default: return "bg-muted text-foreground"
    }
  }

  const countByStatus = (lockers: Locker[]) => ({
    disponibles: lockers.filter((l) => l.status === "disponible").length,
    ocupados: lockers.filter((l) => l.status === "ocupado").length,
    mantenimiento: lockers.filter((l) => l.status === "mantenimiento").length,
  })

  const handleLockerClick = (locker: Locker) => {
    setSelectedLocker(locker)
    setIsDetailDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando distribución de edificios...</p>
      </div>
    )
  }

  if (!selectedEdificio) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Lockers" description="Gestiona los casilleros y solicitudes de alumnos" />

        <div className="flex-1 p-6 lg:p-8 overflow-auto">
          
          {/* BOTÓN DE SOLICITUDES PENDIENTES */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-foreground">Edificios</h2>
            <Button 
              onClick={() => setIsRequestsDialogOpen(true)} 
              variant="outline" 
              className="relative gap-2 font-medium bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <ClipboardList className="w-4 h-4" />
              Solicitudes Pendientes
              {pendingRequests.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-[#c94a4a] text-white border-white border-2 px-1.5 min-w-[20px] h-5 flex items-center justify-center">
                  {pendingRequests.length}
                </Badge>
              )}
            </Button>
          </div>

          {edificios.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No hay lockers registrados en la base de datos.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {edificios.map((edificio) => {
                const counts = countByStatus(edificio.lockers)
                const total = edificio.lockers.length

                return (
                  <Card
                    key={edificio.id}
                    className="group cursor-pointer border-0 shadow-sm hover:shadow-md transition-all duration-200"
                    onClick={() => setSelectedEdificio(edificio)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>

                      <h3 className="font-semibold text-lg mb-1">{edificio.nombre}</h3>
                      <p className="text-sm text-muted-foreground mb-6">{total} lockers</p>

                      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                        <div className="bg-[#2fa4a9] transition-all" style={{ width: `${total > 0 ? (counts.disponibles / total) * 100 : 0}%` }} />
                        <div className="bg-[#c94a4a] transition-all" style={{ width: `${total > 0 ? (counts.ocupados / total) * 100 : 0}%` }} />
                        <div className="bg-[#f2b705] transition-all" style={{ width: `${total > 0 ? (counts.mantenimiento / total) * 100 : 0}%` }} />
                      </div>

                      <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                        <span>{counts.disponibles} libres</span>
                        <span>{counts.ocupados} ocupados</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* --- MODAL DE SOLICITUDES PENDIENTES --- */}
        <Dialog open={isRequestsDialogOpen} onOpenChange={setIsRequestsDialogOpen}>
            <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[85vh] overflow-y-auto">            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <ClipboardList className="text-primary w-5 h-5" /> 
                Solicitudes de Casilleros Pendientes
              </DialogTitle>
              <DialogDescription>
                Aprueba o rechaza las peticiones de los estudiantes. Al aprobar, el casillero se asignará automáticamente.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-500">Todo al día</p>
                  <p className="text-sm">No hay solicitudes pendientes por revisar.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Locker Solicitado</TableHead>
                        <TableHead>Estudiante</TableHead>
                        <TableHead>Matrícula</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-bold text-primary">
                            {req.locker_identificador}
                          </TableCell>
                          <TableCell className="font-medium">{req.usuario_nombre}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{req.usuario_matricula}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={req.shared ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                              {req.shared ? "Compartido" : "Individual"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(req.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => handleProcessRequest(req.id, 'reject')}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Rechazar
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-[#2fa4a9] hover:bg-[#2fa4a9]/90 text-white"
                              onClick={() => handleProcessRequest(req.id, 'approve')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            
            <DialogFooter className="mt-6">
              <Button variant="ghost" onClick={() => setIsRequestsDialogOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const counts = countByStatus(selectedEdificio.lockers)

  return (
    <div className="flex flex-col h-full">
      <Header
        title={selectedEdificio.nombre}
        description={`${selectedEdificio.lockers.length} lockers`}
      />

      <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button variant="ghost" className="w-fit" onClick={() => setSelectedEdificio(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a edificios
          </Button>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#2fa4a9]" />
              <span className="text-muted-foreground">{counts.disponibles} libres</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#c94a4a]" />
              <span className="text-muted-foreground">{counts.ocupados} ocupados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#f2b705]" />
              <span className="text-muted-foreground">{counts.mantenimiento} mant.</span>
            </div>
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-3">
              {selectedEdificio.lockers.map((locker) => (
                <button
                  key={locker.id}
                  onClick={() => handleLockerClick(locker)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium text-white transition-all hover:scale-110 hover:shadow-lg ${getStatusColor(locker.status)}`}
                >
                  {locker.numero}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- MODALES DE DETALLE Y ASIGNACIÓN MANUAL (Se mantienen igual) --- */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl">Locker {selectedLocker?.identificador}</DialogTitle>
            <DialogDescription>
              {selectedLocker?.status === "disponible" && "Disponible para asignar"}
              {selectedLocker?.status === "ocupado" && "Actualmente ocupado"}
              {selectedLocker?.status === "mantenimiento" && "En mantenimiento"}
            </DialogDescription>
          </DialogHeader>

          {selectedLocker && (
            <div className="space-y-4 pt-2">
              {selectedLocker.usuario && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Usuario asignado</p>
                  <p className="font-medium">{selectedLocker.usuario.nombre}</p>
                  <p className="text-sm text-muted-foreground">{selectedLocker.usuario.matricula}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                {selectedLocker.status === "disponible" && (
                  <Button onClick={() => { setIsDetailDialogOpen(false); setIsAssignDialogOpen(true); }}>
                    <UserPlus className="w-4 h-4 mr-2" /> Asignar usuario
                  </Button>
                )}

                {selectedLocker.status === "ocupado" && (
                  <Button variant="outline" className="bg-transparent" onClick={handleReleaseLocker}>
                    <UserMinus className="w-4 h-4 mr-2" /> Liberar locker
                  </Button>
                )}

                {selectedLocker.status !== "mantenimiento" && (
                  <Button
                    variant="ghost"
                    className="text-[#c94a4a] hover:text-[#c94a4a] hover:bg-[#c94a4a]/10"
                    onClick={() => handleChangeStatus("mantenimiento")}
                  >
                    <Wrench className="w-4 h-4 mr-2" /> Enviar a mantenimiento
                  </Button>
                )}

                {selectedLocker.status === "mantenimiento" && (
                  <Button className="bg-[#2fa4a9] hover:bg-[#2fa4a9]/90" onClick={() => handleChangeStatus("disponible")}>
                    <Unlock className="w-4 h-4 mr-2" /> Marcar disponible
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar Locker</DialogTitle>
            <DialogDescription>Selecciona el usuario para {selectedLocker?.identificador}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Usuario</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecciona un usuario" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.matricula} value={user.matricula}>
                    {user.name || user.nombre_completo} ({user.matricula})
                  </SelectItem>
                ))}
                {availableUsers.length === 0 && (
                  <SelectItem value="none" disabled>No hay alumnos activos</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setIsAssignDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssignLocker} disabled={!selectedUser || selectedUser === "none"}>Asignar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}