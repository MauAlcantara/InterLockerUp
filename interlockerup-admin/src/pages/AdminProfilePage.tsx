import { useState, useEffect } from "react"
import { Header } from "@/components/admin/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BASE_URL } from "@/api/apiConfig"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { User, Mail, Shield, Loader2, Save, X, GraduationCap, Scale } from "lucide-react"
import toast from "react-hot-toast"

export default function AdminProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  const [formData, setFormData] = useState({
    nombre_completo: "",
    email: "",
    matricula: "",
  })

  // --- 1. CARGAR DATOS DEL ADMIN ---
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token")
      const res = await fetch(`${BASE_URL}/api/perfil/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        setFormData({ 
          nombre_completo: data.nombre_completo || data.name || "", 
          email: data.email || "", 
          matricula: data.matricula || "" 
        })
      } else {
        toast.error("Tu sesión ha expirado")
      }
    } catch (e) {
      toast.error("Error al cargar el perfil")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  // --- 2. ACTUALIZAR PERFIL ---
  const handleUpdateProfile = async () => {
    if (!formData.nombre_completo.trim() || !formData.email.trim()) {
      toast.error("El nombre y el correo son obligatorios")
      return
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("token")
      const res = await fetch(`${BASE_URL}/perfil/update`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success("¡Perfil actualizado correctamente!")
        // Actualizamos el nombre en el localStorage para que el Header lo lea
        localStorage.setItem("userName", formData.nombre_completo)
        setIsEditing(false)
        fetchUserData() // Recargar datos frescos
      } else {
        const errorData = await res.json()
        toast.error(errorData.mensaje || "Error al actualizar perfil")
      }
    } catch (err) {
      toast.error("Error de conexión con el servidor")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-slate-50/50">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-serif">Cargando tu información...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">


      <Header
        title="Mi Perfil"
        description="Gestiona tu información personal y preferencias del sistema"
      />

      <div className="flex-1 p-8 space-y-6 max-w-5xl mx-auto w-full">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA: Tarjeta de Presentación */}
          <Card className="md:col-span-1 border-0 shadow-sm flex flex-col items-center p-6 text-center h-fit">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-4 border-primary/20">
              <User className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {user?.nombre_completo || user?.name || "Administrador"}
            </h2>
            <p className="text-sm text-primary font-medium mt-1">Nivel: Administrador Total</p>
            <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted px-3 py-1 rounded-md">
              ID: {user?.matricula}
            </p>

            <div className="w-full h-px bg-border my-6" />

            {/* Enlaces Rápidos */}
            <div className="w-full space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start text-muted-foreground"
                onClick={() => setShowPrivacy(true)}
              >
                <Shield className="w-4 h-4 mr-3" />
                Aviso de Privacidad
              </Button>
            </div>
          </Card>

          {/* COLUMNA DERECHA: Formulario de Edición */}
          <Card className="md:col-span-2 border-0 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Detalles de la Cuenta</CardTitle>
                  <CardDescription className="font-serif">
                    Actualiza tus datos de contacto y credenciales
                  </CardDescription>
                </div>
                {!isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Editar Perfil
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                {/* Nombre Completo */}
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="nombre"
                      disabled={!isEditing}
                      value={formData.nombre_completo}
                      onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Correo Electrónico */}
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Institucional</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      disabled={!isEditing}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Matrícula / ID */}
                <div className="space-y-2">
                  <Label htmlFor="matricula">Identificador / Matrícula</Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="matricula"
                      disabled={!isEditing}
                      value={formData.matricula}
                      onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                      className="pl-10 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              {isEditing && (
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setIsEditing(false)
                      // Restaurar datos originales si cancela
                      setFormData({ 
                        nombre_completo: user?.nombre_completo || user?.name || "", 
                        email: user?.email || "", 
                        matricula: user?.matricula || "" 
                      })
                    }}
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4 mr-2" /> Cancelar
                  </Button>
                  <Button onClick={handleUpdateProfile} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Cambios
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- MODAL DEL AVISO DE PRIVACIDAD --- */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-primary">
              <Shield className="w-5 h-5" /> Documentación Legal y Privacidad
            </DialogTitle>
            <DialogDescription>
              Términos de uso y responsabilidades como Administrador de InterLockerUp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4 text-sm text-foreground/80 leading-relaxed text-justify">
            <section>
              <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Aviso de Privacidad
              </h4>
              <p className="mb-2"><strong>InterLockerUp</strong>, con domicilio institucional en Avenida Pie de la Cuesta 2600, 76140 Santiago de Querétaro, Qro., es responsable de la recopilación, almacenamiento, uso y protección de los datos personales.</p>
              <p className="font-semibold mt-3">Finalidades del tratamiento administrativo:</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Gestión y auditoría del acceso a casilleros.</li>
                <li>Atención de incidencias y reportes técnicos.</li>
                <li>Notificaciones de vencimiento y mantenimiento.</li>
              </ul>
            </section>

            <div className="w-full h-px bg-border" />

            <section>
              <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" /> Responsabilidad Administrativa
              </h4>
              <p className="mb-2"><strong>Uso del Panel:</strong> Como administrador, tienes acceso a datos sensibles de los estudiantes. Queda estrictamente prohibido el uso de esta información para fines ajenos a la gestión académica y operativa de la UTEQ.</p>
              <p><strong>Auditoría:</strong> Todas las acciones realizadas (asignaciones, desalojos, envíos de notificaciones) quedan registradas en el sistema con un sello de tiempo y el ID del administrador en turno para fines de control de calidad.</p>
            </section>

            <div className="bg-muted p-4 rounded-lg mt-6">
              <p className="text-xs text-muted-foreground m-0">
                <strong>Última actualización:</strong> 13 de febrero de 2026<br/>
                <strong>Marco Legal:</strong> LFPDPPP (Reforma Nov 2025) y Políticas Internas UTEQ.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}