import { useState, useEffect } from "react"
import { Header } from "@/components/admin/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Loader2
} from "lucide-react"

// Tipos
type Locker = {
  id: string; // En BD es numérico, lo pasamos a string
  identificador: string;
  numero: string; // Para mostrar (ej: "01" del "E1-01")
  status: string;
  usuario: { nombre: string; matricula: string } | null;
}

type Edificio = {
  id: string;
  nombre: string;
  lockers: Locker[];
}

export default function LockersPage() {
  const [edificios, setEdificios] = useState<Edificio[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([]) // Usuarios para asignar
  const [isLoading, setIsLoading] = useState(true)

  const [selectedEdificio, setSelectedEdificio] = useState<Edificio | null>(null)
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState("")

  // --- 1. CARGAR DATOS DE LA BD ---
  const fetchLockers = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/lockers/admin');
      const data = await res.json();
      
      // LOGICA DE AGRUPACIÓN: Convertimos la lista plana en Edificios
      const edificiosMap = new Map<string, Edificio>();
      
      data.forEach((row: any) => {
        // Asumimos que la ubicación o la primera letra del ID nos da el edificio. Ej: "E1-01" -> "E1"
        const edifCode = row.ubicacion_detallada || (row.identificador ? row.identificador.split('-')[0] : 'General');
        const edifName = row.ubicacion_detallada || `Edificio ${edifCode.replace('E', '')}`;
        
        if (!edificiosMap.has(edifCode)) {
          edificiosMap.set(edifCode, { id: edifCode, nombre: edifName, lockers: [] });
        }

        const lockerObj: Locker = {
          id: row.locker_id.toString(),
          identificador: row.identificador,
          numero: row.identificador.includes('-') ? row.identificador.split('-')[1] : row.identificador,
          status: row.estado,
          usuario: row.matricula ? { nombre: row.nombre_completo, matricula: row.matricula } : null
        };

        edificiosMap.get(edifCode)?.lockers.push(lockerObj);
      });

      setEdificios(Array.from(edificiosMap.values()));

      // Si teníamos un edificio seleccionado, lo actualizamos para que no desaparezcan los cambios
      if (selectedEdificio) {
        const updatedSelected = Array.from(edificiosMap.values()).find(e => e.id === selectedEdificio.id);
        if (updatedSelected) setSelectedEdificio(updatedSelected);
      }

    } catch (error) {
      console.error("Error cargando lockers:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Cargar lista de alumnos para el ComboBox de asignar
  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/users');
      const data = await res.json();
      // Filtramos solo los que son alumnos y están activos
      const alumnos = data.filter((u: any) => (u.role === 'alumno' || u.role === 'estudiante') && u.status === 'activo');
      setAvailableUsers(alumnos);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    }
  }

  useEffect(() => {
    fetchLockers();
    fetchUsers();
  }, [])

  // --- 2. ACCIONES DEL ADMINISTRADOR ---

  const handleAssignLocker = async () => {
    if (!selectedLocker || !selectedUser) return;
    try {
      const res = await fetch('http://localhost:3000/api/lockers/admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locker_id: selectedLocker.id, matricula_usuario: selectedUser })
      });
      if (res.ok) {
        await fetchLockers(); // Recargamos para ver los cambios
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
      const res = await fetch(`http://localhost:3000/api/lockers/admin/${selectedLocker.id}/release`, {
        method: 'POST'
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
      const res = await fetch(`http://localhost:3000/api/lockers/admin/${selectedLocker.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevo_estado: newStatus })
      });
      if (res.ok) {
        await fetchLockers();
        setIsDetailDialogOpen(false);
        setSelectedLocker(null);
      }
    } catch (e) { console.error(e) }
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

  // --- RENDERIZADO ---
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando distribución de edificios...</p>
      </div>
    )
  }

  // Vista de edificios (tarjetas principales)
  if (!selectedEdificio) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Lockers" description="Selecciona un edificio para ver sus lockers" />

        <div className="flex-1 p-6 lg:p-8 overflow-auto">
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

                      {/* Mini barra de estado */}
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
      </div>
    )
  }

  // Vista de lockers de un edificio específico
  const counts = countByStatus(selectedEdificio.lockers)

  return (
    <div className="flex flex-col h-full">
      <Header
        title={selectedEdificio.nombre}
        description={`${selectedEdificio.lockers.length} lockers`}
      />

      <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-auto">
        {/* Navegacion y leyenda */}
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

        {/* Grid de Lockers */}
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

      {/* Dialog de Detalle */}
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

      {/* Dialog de Asignar */}
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