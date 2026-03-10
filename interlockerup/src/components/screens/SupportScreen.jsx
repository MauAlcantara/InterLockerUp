import { useState, useEffect } from "react"
import { AlertTriangle, Key, Wrench, HelpCircle, CheckCircle2, Camera, Loader2, UploadCloud } from "lucide-react"
import { API_URL } from "../../config"

const incidentCategories = [
  { id: "damage", label: "Daño físico", icon: AlertTriangle },
  { id: "access", label: "Problema de acceso", icon: Key },
  { id: "maintenance", label: "Limpieza / Mantenimiento", icon: Wrench },
  { id: "other", label: "Otro", icon: HelpCircle },
]

export default function SupportScreen() {
  // Estados para la carga de datos
  const [misLockers, setMisLockers] = useState([])
  const [isLoadingLockers, setIsLoadingLockers] = useState(true)

  // Estados del formulario
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedLockerId, setSelectedLockerId] = useState("")
  const [description, setDescription] = useState("")
  const [photoFile, setPhotoFile] = useState(null)
  
  // Estados de envío y respuesta
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [hashGenerado, setHashGenerado] = useState("")

  // 1. Carga los casilleros que le pertenecen al alumno logueado
  useEffect(() => {
    const fetchMisLockers = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) return

        const res = await fetch(`${API_URL}/lockers/my-lockers`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
        
        if (res.ok) {
          const data = await res.json()
          setMisLockers(data)

          if (data.length > 0) {
            setSelectedLockerId(data[0].id.toString())
          }
        }
      } catch (error) {
        console.error("Error cargando casilleros:", error)
      } finally {
        setIsLoadingLockers(false)
      }
    }
    fetchMisLockers()
  }, [])

  // 2. Envia el formulario
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedCategory || !description || !selectedLockerId) {
      alert("Por favor completa los campos obligatorios.")
      return
    }
    setIsSubmitting(true)

    try {
      const token = localStorage.getItem("token")

      let userId = null
      if (token) {
        const payloadBase64 = token.split('.')[1]
        const decodedPayload = JSON.parse(atob(payloadBase64))
        userId = decodedPayload.id
      }

      if (!userId) {
         alert("Error: No se pudo identificar tu sesión. Vuelve a iniciar sesión.")
         setIsSubmitting(false)
         return
      }

      // Prepara los datos con FormData
      const formData = new FormData()
      formData.append("userId", userId) 
      formData.append("lockerId", selectedLockerId) 
      formData.append("categoria", selectedCategory)
      formData.append("descripcion", description)
      
      // Adjunta la foto si el alumno tomó/subió una
      if (photoFile) {
        formData.append("evidencia", photoFile)
      }

      // Hace la petición POST al backend
      const response = await fetch(`${API_URL}/incidents/reportar`, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setHashGenerado(data.hashGenerado) // Guarda el Hash devuelto
        setIsSubmitted(true)
      } else {
        alert(data.mensaje || "Error al enviar el reporte")
      }
    } catch (error) {
      console.error(error)
      alert("Error al conectar con el servidor.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Pantalla de Éxito ---
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] pb-24">
        <header className="bg-white px-5 pt-12 pb-5 border-b border-gray-100 shadow-sm relative z-10 flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-[#2fa4a9]" />
          <div>
            <h1 className="text-xl font-extrabold text-[#1e293b]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Reporte Enviado</h1>
            <p className="text-[#64748b] text-xs font-medium">Gracias por notificarnos</p>
          </div>
        </header>

        <main className="px-5 mt-8">
          <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 mx-auto bg-[#2fa4a9]/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-[#2fa4a9]" />
            </div>
            <h2 className="text-xl font-bold text-[#1e293b] mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Incidencia registrada
            </h2>
            <p className="text-[#64748b] text-sm mb-6">
              El equipo de administración revisará el problema lo antes posible.
            </p>

            {/* SECCIÓN DE CRIPTOGRÁFIA */}
            {hashGenerado && (
              <div className="bg-[#f1f5f9] p-4 rounded-2xl text-left border border-gray-200 shadow-inner mb-6 space-y-2">
                <p className="text-xs font-bold text-[#0b4dbb] uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4" /> Firma Criptográfica (SHA-256)
                </p>
                <p className="text-[11px] text-[#64748b] font-medium leading-relaxed">
                  Tu evidencia fotográfica fue asegurada. Este hash garantiza que el archivo no será alterado en el servidor:
                </p>
                <div className="bg-white p-3 rounded-xl border border-gray-200 mt-2">
                  <p className="text-xs font-mono text-[#1e293b] break-all leading-snug">
                    {hashGenerado}
                  </p>
                </div>
              </div>
            )}

            <button 
              onClick={() => {
                setIsSubmitted(false)
                setSelectedCategory("")
                setDescription("")
                setPhotoFile(null)
              }}
              className="w-full h-14 rounded-2xl bg-[#0b4dbb] hover:bg-[#0b4dbb]/90 text-white font-bold transition-all active:scale-[0.98] shadow-md shadow-[#0b4dbb]/20"
            >
              Enviar otro reporte
            </button>
          </div>
        </main>
      </div>
    )
  }

  // --- Pantalla Principal ---
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 font-sans text-[#1e293b]">
      {/* Header */}
      <header className="bg-[#0b4dbb] text-white px-6 pt-12 pb-8 rounded-b-3xl shadow-md relative z-10">
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>Reportar Incidente</h1>
        <p className="text-white/80 text-sm mt-1 font-medium">Cuéntanos qué problema tienes</p>
      </header>

      <main className="px-5 mt-6 relative z-20">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 space-y-6">
          
          {/* Tipo de incidente (Grid) */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-[#1e293b]">Tipo de incidente</label>
            <div className="grid grid-cols-2 gap-3">
              {incidentCategories.map((cat) => {
                const Icon = cat.icon
                const isSelected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all border-2 ${
                      isSelected 
                        ? "bg-[#0b4dbb]/5 border-[#0b4dbb] shadow-sm" 
                        : "bg-gray-50 border-transparent hover:bg-gray-100"
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-2 ${isSelected ? "text-[#0b4dbb]" : "text-[#64748b]"}`} />
                    <span className={`text-xs font-semibold ${isSelected ? "text-[#0b4dbb]" : "text-[#64748b]"}`}>
                      {cat.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selección de Casillero Dinámico */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#1e293b]">Número de casillero</label>
            {isLoadingLockers ? (
              <div className="h-12 flex items-center px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando tus casilleros...
              </div>
            ) : (
              <div className="relative">
                <select 
                  value={selectedLockerId}
                  onChange={(e) => setSelectedLockerId(e.target.value)}
                  required
                  className="w-full h-12 rounded-xl border-2 border-gray-100 focus:border-[#0b4dbb] focus:ring-0 px-4 bg-gray-50 text-sm font-semibold outline-none appearance-none transition-colors"
                >
                  {misLockers.length === 0 ? (
                    <option value="">No tienes casilleros asignados</option>
                  ) : (
                    misLockers.map(locker => (
                      <option key={locker.id} value={locker.id}>
                        {locker.identificador} - {locker.ubicacion_detallada}
                      </option>
                    ))
                  )}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#1e293b]">Descripción del problema</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe detalladamente el incidente..."
              className="w-full rounded-2xl border-2 border-gray-100 focus:border-[#0b4dbb] focus:ring-0 p-4 bg-gray-50 text-sm outline-none resize-none transition-colors font-medium"
              rows={4}
            />
          </div>

          {/* Evidencia Fotográfica (File Input) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#1e293b]">Foto (Evidencia)</label>
            <div className="relative">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all ${photoFile ? 'border-[#2fa4a9] bg-[#2fa4a9]/5' : 'border-gray-200 bg-gray-50'}`}>
                {photoFile ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-[#2fa4a9] mb-2" />
                    <p className="text-sm font-semibold text-[#2fa4a9]">¡Imagen seleccionada!</p>
                    <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{photoFile.name}</p>
                  </>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-[#64748b]">Toca para agregar foto</p>
                    <p className="text-xs text-gray-400 mt-1">Obligatorio para generar Hash</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting || misLockers.length === 0 || !selectedCategory || !description}
            className="w-full h-14 rounded-2xl bg-[#0b4dbb] hover:bg-[#0b4dbb]/90 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg shadow-[#0b4dbb]/30 active:scale-[0.98] mt-2"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Procesando...</>
            ) : (
              <><UploadCloud className="w-5 h-5 mr-2" /> Subir y Generar Hash</>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}