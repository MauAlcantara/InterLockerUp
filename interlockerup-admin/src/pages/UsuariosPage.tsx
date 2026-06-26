import { useState, useEffect } from "react"
import { Header } from "@/components/admin/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import toast from "react-hot-toast"
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
  DialogTrigger,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  UserX,
  UserCheck,
  Filter,
  Download,
  Users,
  UserPlus,
  ShieldCheck,
  Loader2,
  Megaphone 
} from "lucide-react"
import { StatsCard } from "@/components/admin/stats-card"

const roleColors = {
  estudiante: "bg-secondary/10 text-secondary border-secondary/20",
  administrador: "bg-primary/10 text-primary border-primary/20",
  alumno: "bg-secondary/10 text-secondary border-secondary/20", 
  admin: "bg-primary/10 text-primary border-primary/20", 
}

const statusColors = {
  activo: "bg-available/10 text-available border-available/20",
  inactivo: "bg-error/10 text-error border-error/20",
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)

  // --- ESTADOS PARA EL AVISO GLOBAL ---
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false)
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false)
  const [announcementData, setAnnouncementData] = useState({
    mensaje: "",
    tipo: "info"
  })

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    matricula: "",
    role: "alumno",
  })

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [])

  const handleCreateUser = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const newUser = await res.json();
        setUsers([newUser, ...users]); 
        setFormData({ name: "", email: "", matricula: "", role: "alumno" });
        setIsCreateDialogOpen(false);
      } else {
        const errorData = await res.json();
        alert(errorData.mensaje || "Error al crear usuario.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión al servidor.");
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`${BASE_URL}/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(users.map((u) => u.id === selectedUser.id ? updatedUser : u));
        setIsEditDialogOpen(false);
        setSelectedUser(null);
      } else {
        alert("Error al editar el usuario.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión al servidor.");
    }
  }

  const handleToggleStatus = async (userId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/api/users/${userId}/status`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const { status } = await res.json();
        setUsers(users.map((u) => u.id === userId ? { ...u, status: status } : u));
      }
    } catch (error) {
      console.error(error);
      alert("Error al cambiar el estado del usuario.");
    }
  }

  // --- FUNCIÓN PARA ENVIAR EL AVISO GLOBAL ---
  const handleCreateAnnouncement = async () => {
    if (!announcementData.mensaje.trim()) {
      alert("El mensaje del aviso no puede estar vacío");
      return;
    }
    setIsSendingAnnouncement(true);
    try {
      // Tomamos el token del admin para pasar el middleware
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
      
      const res = await fetch(`${BASE_URL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mensaje: announcementData.mensaje,
          tipo: announcementData.tipo,
          es_global: true
        })
      });

      if (res.ok) {
        toast.success("¡Aviso global enviado a todos los estudiantes!"); 
        setIsAnnouncementDialogOpen(false);
        setAnnouncementData({ mensaje: "", tipo: "info" });
      } else {
        toast.error("Error al enviar el aviso"); 
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión al servidor."); 
    } finally {
      setIsSendingAnnouncement(false);
    }
  }

  const openEditDialog = (user: any) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      matricula: user.matricula,
      role: user.role,
    })
    setIsEditDialogOpen(true)
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.matricula?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    
    const normalizedRole = user.role === 'admin' ? 'administrador' : 'estudiante';
    const filterRoleNormalized = filterRole === 'admin' ? 'administrador' : filterRole === 'alumno' ? 'estudiante' : filterRole;
    
    const matchesRole = filterRole === "all" || normalizedRole === filterRoleNormalized
    const matchesStatus = filterStatus === "all" || user.status === filterStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  const totalActive = users.filter((u) => u.status === "activo").length
  const totalStudents = users.filter((u) => u.role === "estudiante" || u.role === "alumno").length
  const totalAdmins = users.filter((u) => u.role === "administrador" || u.role === "admin").length

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando lista de usuarios...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Gestion de Usuarios"
        description="Administra los usuarios del sistema de lockers"
      />

      <div className="flex-1 p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total Usuarios"
            value={users.length}
            description="Registrados en el sistema"
            icon={Users}
          />
          <StatsCard
            title="Usuarios Activos"
            value={totalActive}
            description={`${totalStudents} estudiantes, ${totalAdmins} admin`}
            icon={UserPlus}
            variant="available"
          />
          <StatsCard
            title="Administradores"
            value={totalAdmins}
            description="Con acceso total"
            icon={ShieldCheck}
          />
        </div>

        {/* Users Table Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Lista de Usuarios</CardTitle>
                <CardDescription className="font-serif">
                  Gestiona los usuarios registrados en el sistema
                </CardDescription>
              </div>
              
              <div className="flex gap-2">
                {/* --- NUEVO BOTÓN: AVISO GLOBAL --- */}
                <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                      <Megaphone className="w-4 h-4 mr-2" />
                      Aviso Global
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enviar Aviso Global</DialogTitle>
                      <DialogDescription className="font-serif">
                        Este mensaje aparecerá en la bandeja de entrada de <b>todos los estudiantes</b>.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nivel de Importancia</Label>
                        <Select
                          value={announcementData.tipo}
                          onValueChange={(value) => setAnnouncementData({ ...announcementData, tipo: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">Informativo (Azul)</SelectItem>
                            <SelectItem value="success">Éxito / Positivo (Verde)</SelectItem>
                            <SelectItem value="warning">Advertencia / Importante (Amarillo)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Mensaje del Aviso</Label>
                        <Textarea
                          placeholder="Ej: El edificio K permanecerá cerrado mañana por mantenimiento..."
                          value={announcementData.mensaje}
                          onChange={(e) => setAnnouncementData({ ...announcementData, mensaje: e.target.value })}
                          className="min-h-[100px] resize-none"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateAnnouncement} disabled={isSendingAnnouncement}>
                        {isSendingAnnouncement ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Enviar a Todos
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Botón original de crear usuario */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Usuario
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
                      <DialogDescription className="font-serif">
                        Ingresa los datos del nuevo usuario. Su contraseña inicial será <b>Uteq2026!</b>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre completo</Label>
                        <Input
                          id="name"
                          placeholder="Juan Perez Garcia"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Correo electronico</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="usuario@uteq.edu.mx"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matricula">Matricula / ID</Label>
                        <Input
                          id="matricula"
                          placeholder="20210001"
                          value={formData.matricula}
                          onChange={(e) =>
                            setFormData({ ...formData, matricula: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Rol</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) =>
                            setFormData({ ...formData, role: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="alumno">Estudiante</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateUser}>Registrar Usuario</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, correo o matricula..."
                  className="pl-10 font-serif"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    <SelectItem value="estudiante">Estudiante</SelectItem>
                    <SelectItem value="administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
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
                    <TableHead className="font-semibold">Usuario</TableHead>
                    <TableHead className="font-semibold">Matricula</TableHead>
                    <TableHead className="font-semibold">Rol</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Registro</TableHead>
                    <TableHead className="font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground font-serif">
                              {user.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{user.matricula}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={roleColors[user.role as keyof typeof roleColors]}
                          >
                            {user.role === "estudiante" || user.role === "alumno" ? "Estudiante" : "Administrador"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusColors[user.status as keyof typeof statusColors]}
                          >
                            {user.status === "activo" ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-serif">
                          {user.createdAt}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(user.id)}>
                                {user.status === "activo" ? (
                                  <>
                                    <UserX className="w-4 h-4 mr-2" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No se encontraron usuarios.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination info */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground font-serif">
                Mostrando {filteredUsers.length} de {users.length} usuarios
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription className="font-serif">
              Modifica los datos del usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre completo</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Correo electronico</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-matricula">Matricula / ID</Label>
              <Input
                id="edit-matricula"
                value={formData.matricula}
                onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alumno">Estudiante</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditUser}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}