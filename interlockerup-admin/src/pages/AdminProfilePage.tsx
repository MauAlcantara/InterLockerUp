import { useState, useEffect } from "react"
import {
  User,
  Mail,
  Shield,
  Loader2,
  Edit3,
  IdCard,
  X,
} from "lucide-react"
import { BASE_URL } from "@/api/apiConfig"
import toast from "react-hot-toast"

// Paleta idéntica al perfil del alumno
const COLORS = {
  primary: "#0b4dbb",
  success: "#2fa4a9",
  error: "#c94a4a",
  text: "#2e2e2e",
  textSec: "#8a8a8a",
}

interface Perfil {
  nombre_completo: string
  email: string
  matricula: string
}

export default function AdminProfilePage() {
  const [user, setUser] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editNombre, setEditNombre] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editMatricula, setEditMatricula] = useState("")

  const fetchPerfil = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const res = await fetch(`${BASE_URL}/api/perfil/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Error al obtener el perfil")
      const data = await res.json()
      setUser({
        nombre_completo: data.nombre_completo || data.name || "Administrador",
        email: data.email || "",
        matricula: data.matricula || "",
      })
    } catch (err) {
      console.error(err)
      toast.error("No se pudo cargar tu perfil")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPerfil()
  }, [])

  const handleToggleEdit = () => {
    if (!user) return
    if (!isEditing) {
      setEditNombre(user.nombre_completo)
      setEditEmail(user.email)
      setEditMatricula(user.matricula)
    }
    setIsEditing(!isEditing)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editNombre.trim()) {
      toast.error("El nombre no puede estar vacío")
      return
    }
    setSaving(true)
    try {
      const token = localStorage.getItem("admin_token")
      const res = await fetch(`${BASE_URL}/api/perfil/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre_completo: editNombre.trim(),
          email: editEmail.trim(),
          matricula: editMatricula.trim(),
        }),
      })
      if (!res.ok) throw new Error("Error al guardar")
      toast.success("Datos actualizados correctamente")
      setIsEditing(false)
      await fetchPerfil()
    } catch (err) {
      console.error(err)
      toast.error("No se pudieron guardar los cambios")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    const token = localStorage.getItem("admin_token")
    // Invalidamos la sesión en el servidor (si falla, seguimos igual)
    if (token) {
      try {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        })
      } catch (err) {
        console.error("Error al cerrar sesión en servidor:", err)
      }
    }
    localStorage.removeItem("admin_token")
    localStorage.removeItem("userName")
    window.location.href = "/"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center font-serif">
        <Loader2 className="animate-spin" size={32} color={COLORS.primary} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-serif" style={{ color: COLORS.text }}>
      {/* ===== Header (igual que el perfil del alumno) ===== */}
      <div className="bg-[#0b4dbb] text-white text-center px-4 pt-[60px] pb-[40px]">
        <div className="w-[85px] h-[85px] rounded-full bg-white mx-auto mb-3 flex items-center justify-center border-[3px] border-white/30">
          <User size={45} color={COLORS.primary} />
        </div>
        <h1 className="text-[20px] font-bold font-sans">{user?.nombre_completo}</h1>
        <p className="text-[14px] opacity-90">Matrícula: {user?.matricula || "—"}</p>
      </div>

      {/* ===== Main ===== */}
      <main className="px-4 -mt-5 flex flex-col gap-4">
        {/* Card: Datos de Usuario */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[14px] font-bold font-sans" style={{ color: COLORS.primary }}>
              Datos de Usuario
            </span>
            <button
              onClick={handleToggleEdit}
              className="cursor-pointer"
              style={{ color: COLORS.primary }}
              aria-label="Editar datos"
            >
              <Edit3 size={18} />
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <input
                type="text"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                placeholder="Nombre completo"
                className="p-3 rounded-[10px] border border-[#ddd] text-[14px] bg-white outline-none focus:border-[#0b4dbb]"
              />
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Correo electrónico"
                className="p-3 rounded-[10px] border border-[#ddd] text-[14px] bg-white outline-none focus:border-[#0b4dbb]"
              />
              <input
                type="text"
                value={editMatricula}
                onChange={(e) => setEditMatricula(e.target.value)}
                placeholder="Matrícula"
                className="p-3 rounded-[10px] border border-[#ddd] text-[14px] bg-white outline-none focus:border-[#0b4dbb]"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full h-12 rounded-xl bg-[#0b4dbb] text-white text-[14px] font-bold font-sans cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Guardar Cambios
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Mail size={18} color={COLORS.primary} />
                <span className="text-[14px] text-[#444]">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <IdCard size={18} color={COLORS.primary} />
                <span className="text-[14px] text-[#444]">ID: {user?.matricula || "—"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Botones: Privacidad / Soporte */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowPrivacy(true)}
            className="p-[18px] bg-white rounded-[18px] border-0 shadow-[0_4px_10px_rgba(0,0,0,0.04)] flex flex-col items-center gap-2 cursor-pointer"
          >
            <Shield size={24} color={COLORS.primary} />
            <span className="text-[12px] font-bold font-sans text-[#2e2e2e]">Privacidad</span>
          </button>
          <button
            onClick={() => toast("Soporte: Central UTEQ 442 209 6100")}
            className="p-[18px] bg-white rounded-[18px] border-0 shadow-[0_4px_10px_rgba(0,0,0,0.04)] flex flex-col items-center gap-2 cursor-pointer"
          >
            <Mail size={24} color={COLORS.success} />
            <span className="text-[12px] font-bold font-sans text-[#2e2e2e]">Soporte</span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pb-6">
          <p className="text-[12px] text-[#8a8a8a]">Central UTEQ: 442 209 6100</p>
          <button
            onClick={handleLogout}
            className="w-full text-left bg-none border-0 font-bold p-[10px] text-[14px] font-sans cursor-pointer"
            style={{ color: COLORS.error }}
          >
            Cerrar Sesión
          </button>
        </div>
      </main>

      {/* ===== Modal Privacidad (bottom sheet, igual que el alumno) ===== */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={() => setShowPrivacy(false)}>
          <div
            className="w-full h-[90%] bg-white rounded-t-[25px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white flex items-center justify-between p-5 sticky top-0 z-10">
              <h2 className="text-[16px] font-bold font-sans text-[#2e2e2e]">Privacidad</h2>
              <button onClick={() => setShowPrivacy(false)} className="cursor-pointer text-[#8a8a8a]" aria-label="Cerrar">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto px-5 pb-8 flex flex-col gap-5 text-[14px] text-[#444] font-serif">
              <p>
                En InterLockerUp, tu información personal (nombre, matrícula y correo) se utiliza únicamente para
                gestionar tus casilleros y solicitudes. No compartimos datos con terceros ni los usamos con fines
                comerciales.
              </p>
              <p>
                Para solicitar la eliminación de tus datos o ejercer tu derecho de acceso, escríbenos a través de la
                Central UTEQ (442 209 6100) o contacta a soporte.
              </p>
              <div className="bg-[#f0f4f8] rounded-xl p-4 text-[13px] text-[#666]">
                Última actualización: 2025. Al usar la plataforma aceptas esta política de privacidad.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
