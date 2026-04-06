"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Lock, AlertCircle, Loader2, CheckCircle2, Clock, QrCode, Hash } from "lucide-react"
import Button from "../ui/button"
import { KeyRound } from "lucide-react";
import { Card, CardContent } from "../ui/card"
import QRCode from "react-qr-code"

const api = import.meta.env.VITE_API_URL

export default function AccessScreen({ onNavigate }) {
  const [countdown, setCountdown] = useState(60)
  const [qrValue, setQrValue] = useState("")
  const [pinValue, setPinValue] = useState("") 
  const [lockerData, setLockerData] = useState({ numero: null, id: null, ubicacion: "" })
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [error, setError] = useState(null)
  const [hasAssignment, setHasAssignment] = useState(true)

  const colors = {
    primary: "#0b4dbb",
    secondary: "#1f78ff",
    success: "#2fa4a9",
    warning: "#f2b705",
    error: "#c94a4a",
    backgroundSoft: "#eaf2ff",
    textMain: "#2e2e2e",
    textSecondary: "#8a8a8a"
  }

  const fetchNewToken = useCallback(async (updatePin = false) => {
    setIsRefreshing(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      
      const checkRes = await fetch(`${api}/api/perfil/my-locker`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      if (!checkRes.ok) { setHasAssignment(false); setIsRefreshing(false); return }

      const checkData = await checkRes.json()
      setLockerData({ numero: checkData.numero, id: checkData.id, ubicacion: checkData.ubicacion_detallada })

      const response = await fetch(`${api}/api/qr/generate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
      })

      if (response.ok) {
        const data = await response.json()
        setQrValue(data.token)
        if (updatePin) setPinValue(data.pin?.code || "")
        setHasAssignment(true)
        setCountdown(60)
      } else {
        const errorData = await response.json()
        setError(errorData.mensaje || "Error al generar código")
      }
    } catch (err) {
      setError("Error de conexión")
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchNewToken(true) }, [fetchNewToken])

  useEffect(() => {
    if (!hasAssignment || error || isRefreshing) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { fetchNewToken(false); return 60 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [fetchNewToken, hasAssignment, error, isRefreshing])

  if (isRefreshing && !qrValue) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fb" }}>
        <Loader2 size={40} color={colors.primary} className="animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "90px", background: "#f8f9fb", fontFamily: "'Roboto', sans-serif" }}>
      <header style={{ background: colors.primary, color: "white", padding: "56px 16px 40px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, background: "rgba(255,255,255,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Lock size={28} />
        </div>
        <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 22, fontWeight: "700", margin: 0 }}>
          Código de Acceso
        </h1>
        <p style={{ opacity: 0.85, fontSize: 14, marginTop: 4 }}>
          Válido para el casillero: {lockerData.numero || "..."}
        </p>
      </header>

      <main style={{ padding: "0 16px", marginTop: -24 }}>
        <Card style={{ borderRadius: 16, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <CardContent style={{ padding: 24 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: colors.textSecondary, textTransform: "uppercase", fontWeight: 600, letterSpacing: "1px", fontFamily: "'Montserrat', sans-serif" }}>
                Asignación Vigente
              </p>
              <h2 style={{ fontSize: 28, fontWeight: "700", color: colors.primary, fontFamily: "'Montserrat', sans-serif", margin: "4px 0" }}>
                {lockerData.numero ? `Locker ${lockerData.numero}` : "Cargando..."}
              </h2>
              <p style={{ fontSize: 14, color: colors.success, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <CheckCircle2 size={16} /> Sistema Activo
              </p>
            </div>

            {/* SECCIÓN QR */}
            <div style={{ position: "relative", background: "white", padding: 20, borderRadius: 16, border: `2px solid ${colors.backgroundSoft}`, display: "flex", justifyContent: "center", minHeight: "220px", alignItems: "center" }}>
              <div style={{ opacity: isRefreshing ? 0.2 : 1, transition: "opacity 0.3s" }}>
                {qrValue && <QRCode value={qrValue} size={180} level="H" bgColor="#ffffff" fgColor={colors.primary} />}
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: colors.textMain, fontWeight: 500 }}>Refresco automático en:</span>
                <span style={{ fontSize: 20, fontWeight: "700", color: countdown <= 10 ? colors.error : colors.success }}>{countdown}s</span>
              </div>
              <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(countdown / 60) * 100}%`, background: countdown <= 10 ? colors.error : colors.success, transition: "width 1s linear" }} />
              </div>
            </div>

            <Button onClick={() => fetchNewToken(false)} disabled={isRefreshing} style={{ width: "100%", marginTop: 24, height: 50, borderRadius: "12px", border: "none", color: colors.primary, fontWeight: "700", background: colors.backgroundSoft, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              Actualizar Código
            </Button>

            <hr style={{ border: "none", height: "1px", background: "#f0f0f0", margin: "24px 0" }} />

            {/* PIN SECTION */}
            <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Código PIN Alternativo</p>
                <div style={{ fontSize: 32, fontWeight: "800", color: colors.textMain, letterSpacing: 8, fontFamily: "'Montserrat', sans-serif" }}>
                    {pinValue || "------"}
                </div>
                <p style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <Clock size={12} /> Válido por 5 minutos
                </p>
            </div>
          </CardContent>
        </Card>

        {/* INSTRUCCIONES CLARAS Y SEPARADAS */}
        <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 700, color: colors.textMain, margin: "24px 0 12px 8px" }}>
          Instrucciones de uso
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

  {/* HEADER */}
  {/* QR */}
  <div style={{
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "white",
    padding: 16,
    borderRadius: 12,
    borderLeft: `4px solid ${colors.primary}`
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <QrCode size={18} color={colors.primary} />
      <strong style={{ fontSize: 14, color: colors.textMain }}>
        Acceso con QR
      </strong>
    </div>

    <p style={{ fontSize: 14, margin: 0, color: colors.textMain }}>
      Ajusta el brillo de tu pantalla al máximo y coloca el código QR frente al lector del casillero.
    </p>

    <p style={{ fontSize: 13, margin: 0, color: colors.textSecondary }}>
      El código QR se actualiza automáticamente cada 60 segundos por seguridad.
    </p>
  </div>

  {/* PIN */}
  <div style={{
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "white",
    padding: 16,
    borderRadius: 12,
    borderLeft: `4px solid ${colors.warning}`
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <KeyRound size={18} color={colors.warning} />
      <strong style={{ fontSize: 14, color: colors.textMain }}>
        Acceso con PIN
      </strong>
    </div>

    <p style={{ fontSize: 14, margin: 0, color: colors.textMain }}>
      Ingresa tu código de 6 dígitos en el teclado del casillero y presiona la tecla # para confirmar.
    </p>

    <p style={{ fontSize: 13, margin: 0, color: colors.textSecondary }}>
      El PIN es de un solo uso y vence en 5 minutos. Puedes utilizarlo aunque el código QR haya cambiado.
    </p>
  </div>

</div>
      </main>
    </div>
  )
}