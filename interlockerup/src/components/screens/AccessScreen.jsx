import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Lock, AlertCircle } from "lucide-react"
import QRCode from "react-qr-code"

export default function AccessScreen() {
  const [countdown, setCountdown] = useState(60)
  const [qrValue, setQrValue] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const generateQRValue = useCallback(() => {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    return `INTERLOCKERUP-A12-${timestamp}-${randomId}`
  }, [])

  const refreshQR = useCallback(() => {
    setIsRefreshing(true)
    setTimeout(() => { setQrValue(generateQRValue()); setCountdown(60); setIsRefreshing(false) }, 500)
  }, [generateQRValue])

  useEffect(() => { setQrValue(generateQRValue()) }, [generateQRValue])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => { if (prev <= 1) { refreshQR(); return 60 } return prev - 1 })
    }, 1000)
    return () => clearInterval(timer)
  }, [refreshQR])

  const getCountdownColor = () => { if (countdown <= 10) return "text-[#c94a4a]"; if (countdown <= 20) return "text-[#f2b705]"; return "text-[#2fa4a9]" }
  const getProgressColor = () => { if (countdown <= 10) return "bg-[#c94a4a]"; if (countdown <= 20) return "bg-[#f2b705]"; return "bg-[#2fa4a9]" }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <header className="bg-[#0b4dbb] text-white px-4 pt-12 pb-8 text-center">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3"><Lock className="w-6 h-6" /></div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>Codigo de Acceso</h1>
        <p className="text-white/80 text-sm mt-1">Escanea para abrir tu casillero</p>
      </header>

      <main className="px-4 -mt-6">
        <div className="bg-white rounded-xl shadow-xl p-6">
          <div className="text-center mb-6">
            <p className="text-sm text-[#64748b]">Tu casillero</p>
            <h2 className="text-2xl font-bold text-[#0b4dbb]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Locker A-12</h2>
            <p className="text-xs text-[#64748b] mt-1">Edificio Principal - Planta Baja</p>
          </div>

          <div className="relative bg-white p-6 rounded-2xl border-2 border-dashed border-[#e2e8f0]">
            <div className={`transition-opacity duration-300 ${isRefreshing ? "opacity-30" : "opacity-100"}`}>
              {qrValue && <QRCode value={qrValue} size={200} level="H" className="mx-auto" bgColor="#ffffff" fgColor="#0b4dbb" />}
            </div>
            {isRefreshing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-10 h-10 text-[#0b4dbb] animate-spin" />
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#64748b]">Codigo valido por:</span>
              <span className={`text-2xl font-bold ${getCountdownColor()}`} style={{ fontFamily: "'Montserrat', sans-serif" }}>{countdown}s</span>
            </div>
            <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${getProgressColor()}`} style={{ width: `${(countdown / 60) * 100}%` }} />
            </div>
          </div>

          <button onClick={refreshQR} disabled={isRefreshing} className="w-full mt-6 h-12 rounded-lg border-2 border-[#1f78ff] text-[#1f78ff] hover:bg-[#1f78ff]/5 font-semibold bg-white flex items-center justify-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />Generar Nuevo Codigo
          </button>
        </div>

        <div className="mt-4 bg-[#0b4dbb]/5 border border-[#0b4dbb]/20 rounded-xl shadow-md p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-[#0b4dbb] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-[#1e293b] mb-1">Instrucciones de uso:</p>
              <ol className="text-[#64748b] space-y-1 list-decimal list-inside">
                <li>Acercate al lector QR de tu casillero</li>
                <li>Muestra este codigo en la pantalla</li>
                <li>Espera la confirmacion de apertura</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}