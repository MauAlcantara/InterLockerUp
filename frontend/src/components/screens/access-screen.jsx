"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Lock, AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
import Button from "../ui/button"
import { Card, CardContent } from "../ui/card"
import QRCode from "react-qr-code"

const api = import.meta.env.VITE_API_URL

export default function AccessScreen({ onNavigate }) {
  const [countdown, setCountdown] = useState(60)
  const [qrValue, setQrValue] = useState("")
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

  const fetchNewToken = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      
      // PASO 1: Verificar casillero
      const checkRes = await fetch(`${api}/api/perfil/my-locker`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      if (!checkRes.ok) {
        setHasAssignment(false)
        setIsRefreshing(false)
        return
      }

      const checkData = await checkRes.json()

      if (!checkData || !checkData.numero) {
        setHasAssignment(false)
        setIsRefreshing(false)
        return
      }

      setLockerData({
        numero: checkData.numero,
        id: checkData.id,
        ubicacion: checkData.ubicacion_detallada
      })

      // PASO 2: Generar Token
      const response = await fetch(`${api}/api/qr/generate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQrValue(data.token)
        setHasAssignment(true)
        setCountdown(60)
      } else {
        const errorData = await response.json()
        setError(errorData.mensaje || "Error al generar código")
      }
    } catch (err) {
      setError("Error de conexión con el servidor")
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchNewToken()
  }, [fetchNewToken])

  useEffect(() => {
    if (!hasAssignment || error || isRefreshing) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchNewToken()
          return 60
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [fetchNewToken, hasAssignment, error, isRefreshing])

  // --- ESTADO DE CARGA INICIAL ---
  if (isRefreshing && !qrValue) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fb" }}>
        <Loader2 size={40} color={colors.primary} className="animate-spin" />
      </div>
    )
  }

  // --- VISTA SIN LOCKER ASIGNADO ---
  if (!hasAssignment) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fb", fontFamily: "'Roboto', sans-serif" }}>
        <header style={{ background: colors.primary, color: "white", padding: "56px 16px 40px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <AlertCircle size={28} />
          </div>
          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 24, fontWeight: "700", margin: 0 }}>Sin Acceso</h1>
        </header>
        <main style={{ padding: "0 16px", marginTop: -24 }}>
          <Card style={{ borderRadius: 16, border: "none", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <CardContent style={{ padding: "40px 24px" }}>
              <div style={{ marginBottom: 20, color: colors.warning }}>
                <Lock size={60} style={{ margin: "0 auto", opacity: 0.3 }} />
              </div>
              <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 20, fontWeight: 700, color: colors.textMain, marginBottom: 12 }}>No detectamos tu casillero</h2>
              <p style={{ color: colors.textSecondary, fontSize: 15, lineHeight: "1.6", marginBottom: 24 }}>
                Asegúrate de tener una solicitud aprobada. Si acabas de recibirla, intenta refrescar la pantalla.
              </p>
              <Button onClick={() => fetchNewToken()} style={{ background: colors.primary, color: "white", width: "100%", height: 48, borderRadius: 12, fontWeight: 700, marginBottom: 10, border: "none" }}>
                Verificar de nuevo
              </Button>
              <button onClick={() => onNavigate("request")} style={{ background: "none", border: "none", color: colors.primary, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Ir a solicitudes
              </button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // --- VISTA PRINCIPAL DEL QR ---
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

            <div style={{ position: "relative", background: "white", padding: 20, borderRadius: 16, border: `2px solid ${colors.backgroundSoft}`, display: "flex", justifyContent: "center", minHeight: "220px", alignItems: "center" }}>
              <div style={{ opacity: isRefreshing ? 0.2 : 1, transition: "opacity 0.3s" }}>
                {qrValue && <QRCode value={qrValue} size={180} level="H" bgColor="#ffffff" fgColor={colors.primary} />}
              </div>
              {isRefreshing && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 size={40} color={colors.primary} className="animate-spin" />
                </div>
              )}
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: colors.textMain, fontWeight: 500 }}>Refresco automático en:</span>
                <span style={{ fontSize: 20, fontWeight: "700", color: countdown <= 10 ? colors.error : colors.success, fontFamily: "'Montserrat', sans-serif" }}>
                  {countdown}s
                </span>
              </div>
              <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(countdown / 60) * 100}%`, background: countdown <= 10 ? colors.error : colors.success, transition: "width 1s linear" }} />
              </div>
            </div>

            <Button
              onClick={fetchNewToken}
              disabled={isRefreshing}
              style={{
                width: "100%", marginTop: 24, height: 50, borderRadius: "12px", border: "none", color: colors.primary,
                fontFamily: "'Montserrat', sans-serif", fontWeight: "700", fontSize: "14px", background: colors.backgroundSoft,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer"
              }}
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              Actualizar Código
            </Button>
          </CardContent>
        </Card>

        <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 700, color: colors.textMain, margin: "24px 0 12px 8px" }}>
          Instrucciones de uso
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { step: 1, text: `Ubica tu Locker ${lockerData.numero || "asignado"}.` },
            { step: 2, text: "Sube el brillo de tu pantalla y escanea el código." },
            { step: 3, text: "Al escuchar el clic, tira de la puerta para abrir." }
          ].map((item) => (
            <div key={item.step} style={{ display: "flex", gap: 12, background: "white", padding: 16, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ background: colors.backgroundSoft, color: colors.primary, width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>
                {item.step}
              </div>
              <p style={{ fontSize: 14, color: colors.textMain, margin: 0, fontFamily: "'Roboto', sans-serif", alignSelf: "center" }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}