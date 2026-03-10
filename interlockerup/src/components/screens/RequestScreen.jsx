import { useState, useEffect } from "react"
import { Box, Users, Key, AlertTriangle, CheckCircle2, Loader2, Info, Building2 } from "lucide-react"
import { API_URL } from "../../config"

export default function RequestScreen() {
  const [edificios, setEdificios] = useState([])
  const [selectedEdificio, setSelectedEdificio] = useState(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Formulario
  const [selectedLocker, setSelectedLocker] = useState(null)
  const [isShared, setIsShared] = useState(false)
  const [partnerMatricula, setPartnerMatricula] = useState("")

  useEffect(() => {
    const fetchLockers = async () => {
      try {
        const token = localStorage.getItem("token")
        
        const response = await fetch(`${API_URL}/lockers/available`, {
          headers: { "Authorization": `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          
          const edificiosMap = new Map()
          data.forEach(locker => {
            const edifCode = locker.ubicacion_detallada || (locker.identificador ? locker.identificador.split('-')[0] : 'General')
            if (!edificiosMap.has(edifCode)) {
              edificiosMap.set(edifCode, { id: edifCode, nombre: edifCode, lockers: [] })
            }
            edificiosMap.get(edifCode).lockers.push(locker)
          })

          const edificiosArray = Array.from(edificiosMap.values())
          setEdificios(edificiosArray)
          
          if (edificiosArray.length > 0) {
            setSelectedEdificio(edificiosArray[0])
          }
        }
      } catch (error) {
        console.error("Error al cargar lockers:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchLockers()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedLocker) return
    setIsSubmitting(true)

    try {
      const token = localStorage.getItem("token")
      const fechaVencimiento = new Date()
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 4)

      const response = await fetch(`${API_URL}/lockers/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          locker_id: selectedLocker.id,
          es_compartido: isShared,
          partner_matricula: isShared ? partnerMatricula : null,
          fecha_vencimiento: fechaVencimiento.toISOString()
        })
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
      } else {
        alert(data.mensaje || "Error al solicitar el casillero")
      }
    } catch (error) {
      console.error(error)
      alert("Error de conexión.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "disponible": return "bg-[#2fa4a9] text-white shadow-md hover:bg-[#2fa4a9]/90"
      case "ocupado": return "bg-[#c94a4a] text-white opacity-40 cursor-not-allowed"
      case "mantenimiento": return "bg-[#f2b705] text-white opacity-40 cursor-not-allowed"
      default: return "bg-gray-200 text-gray-500 cursor-not-allowed"
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#f8fafc] pb-24">
        <header className="bg-[#0b4dbb] text-white px-6 pt-12 pb-8 rounded-b-3xl shadow-md">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>Solicitud Exitosa</h1>
        </header>
        <main className="px-5 -mt-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
            <div className="w-24 h-24 mx-auto bg-[#2fa4a9]/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-[#2fa4a9]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1e293b] mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>¡Casillero Asignado!</h2>
            <p className="text-[#64748b] mb-8">Tu casillero <strong className="text-[#0b4dbb]">{selectedLocker?.identificador}</strong> ya está listo para usarse.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full h-14 rounded-xl bg-[#0b4dbb] hover:bg-[#0b4dbb]/90 text-white font-bold text-lg shadow-lg shadow-[#0b4dbb]/30 transition-all"
            >
              Ir al Inicio
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 font-sans">
      {/* 1. Estilos para ocultar la barra de scroll nativa */}
      <style>
        {`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>

      {/* Header con bordes más redondeados */}
      <header className="bg-[#0b4dbb] text-white px-6 pt-12 pb-8 rounded-b-3xl shadow-md relative z-10">
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>Solicitar Casillero</h1>
        <p className="text-white/80 text-sm mt-1 font-medium">Elige tu espacio en el mapa</p>
      </header>

      <main className="mt-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-[#0b4dbb] animate-spin mb-4" />
            <p className="text-[#64748b] font-medium">Cargando mapa de casilleros...</p>
          </div>
        ) : edificios.length === 0 ? (
          <div className="mx-5 bg-white rounded-3xl shadow-sm p-8 text-center border border-gray-100">
            <AlertTriangle className="w-14 h-14 text-[#f2b705] mx-auto mb-4" />
            <h3 className="font-bold text-lg text-[#1e293b]">Sistema vacío</h3>
            <p className="text-[#64748b] mt-2">No hay casilleros registrados actualmente.</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Pestañas de Edificios (Deslizables sin scrollbar) */}
            <div className="flex overflow-x-auto gap-3 px-5 pb-2 snap-x no-scrollbar">
              {edificios.map(edif => (
                <button
                  key={edif.id}
                  onClick={() => { setSelectedEdificio(edif); setSelectedLocker(null); }}
                  className={`snap-start shrink-0 px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all ${
                    selectedEdificio?.id === edif.id 
                      ? "bg-[#0b4dbb] text-white shadow-lg shadow-[#0b4dbb]/30" 
                      : "bg-white text-[#64748b] border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  {edif.nombre}
                </button>
              ))}
            </div>

            {/* Mapa de Casilleros */}
            <div className="mx-5 bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
              
              {/* Leyenda Visual */}
              <div className="flex items-center justify-center gap-5 mb-6 text-[11px] uppercase font-bold text-gray-500 tracking-wider">
                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-full bg-[#2fa4a9] shadow-sm"></div> Libre</div>
                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-full bg-[#c94a4a] opacity-40"></div> Ocupado</div>
                <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-full bg-[#f2b705] opacity-40"></div> Mant.</div>
              </div>

              {/* Grid Ajustado */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {selectedEdificio?.lockers.map(locker => {
                  const isSelected = selectedLocker?.id === locker.id
                  const isAvailable = locker.estado === 'disponible'

                  return (
                    <button
                      key={locker.id}
                      disabled={!isAvailable}
                      onClick={() => setSelectedLocker(locker)}
                      className={`
                        aspect-square rounded-2xl flex items-center justify-center text-lg font-bold transition-all duration-200
                        ${getStatusColor(locker.estado)}
                        ${isSelected ? "ring-4 ring-offset-2 ring-[#0b4dbb] scale-105 shadow-xl z-10" : ""}
                      `}
                    >
                      {locker.identificador.split('-')[1] || locker.identificador}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Formulario de Confirmación (Aparece al seleccionar) */}
            {selectedLocker && (
              <form onSubmit={handleSubmit} className="mx-5 bg-white rounded-3xl shadow-lg p-6 border border-gray-100 space-y-6 animate-in slide-in-from-bottom-4 mb-8">
                
                <div className="flex items-center justify-between pb-5 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Has seleccionado el</p>
                    <p className="text-2xl font-black text-[#0b4dbb]">Locker {selectedLocker.identificador}</p>
                  </div>
                  <div className="w-14 h-14 bg-[#2fa4a9]/10 rounded-2xl flex items-center justify-center">
                    <Box className="w-7 h-7 text-[#2fa4a9]" />
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Users className="w-5 h-5 text-[#64748b]" />
                      </div>
                      <span className="text-sm font-bold text-[#1e293b]">Casillero Compartido</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={isShared}
                        onChange={(e) => setIsShared(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4dbb]"></div>
                    </label>
                  </div>

                  {isShared && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[11px] font-bold text-[#64748b] block mb-2 tracking-wider">MATRÍCULA DEL COMPAÑERO</label>
                      <input 
                        type="text" 
                        placeholder="Ej. 20210001" 
                        value={partnerMatricula}
                        onChange={(e) => setPartnerMatricula(e.target.value)}
                        required={isShared}
                        className="w-full h-14 rounded-2xl border-2 border-gray-100 focus:border-[#0b4dbb] focus:bg-white focus:outline-none text-base px-4 bg-gray-50 transition-colors font-medium"
                      />
                      <p className="text-xs text-[#64748b] mt-3 flex items-start gap-1.5 leading-snug">
                        <Info className="w-4 h-4 flex-shrink-0 text-[#0b4dbb]" />
                        Ambos podrán generar códigos QR para abrir este casillero.
                      </p>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting || (isShared && !partnerMatricula)}
                  className="w-full h-14 rounded-2xl bg-[#0b4dbb] hover:bg-[#0b4dbb]/90 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg shadow-[#0b4dbb]/30 mt-2" 
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Procesando...</>
                  ) : (
                    <><Key className="w-6 h-6 mr-2" /> Confirmar Asignación</>
                  )}
                </button>
              </form>
            )}

          </div>
        )}
      </main>
    </div>
  )
}