"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Lock, Loader2, CheckCircle2, Clock, QrCode, KeyRound, X, Mail, AlertCircle } from "lucide-react"
import Button from "../ui/button"
import { Card, CardContent } from "../ui/card"
import QRCode from "react-qr-code"
import toast, { Toaster } from "react-hot-toast";

const api = import.meta.env.VITE_API_URL

export default function AccessScreen({ onNavigate }) {
  const [countdown, setCountdown] = useState(60)
  const [qrValue, setQrValue] = useState("")
  const [lockerData, setLockerData] = useState({ numero: null, id: null, ubicacion: "" })
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [error, setError] = useState(null)
  const [hasAssignment, setHasAssignment] = useState(true)

  // --- ESTADOS PARA LA APERTURA DE EMERGENCIA ---
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [emergencyStep, setEmergencyStep] = useState("request") // "request" | "input"
  const [emailPin, setEmailPin] = useState("")
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false)
  const [emergencyError, setEmergencyError] = useState("")

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
        setHasAssignment(true)
        setCountdown(60)
      } else {
        const errorData = await response.json()
        setError(errorData.mensaje || "Error al generar código QR")
      }
    } catch (err) {
      setError("Error de conexión al obtener QR")
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchNewToken() }, [fetchNewToken])

  useEffect(() => {
    if (!hasAssignment || error || isRefreshing) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { fetchNewToken(); return 60 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [fetchNewToken, hasAssignment, error, isRefreshing])


  // --- FUNCIONES DE EMERGENCIA (API) ---
  const handleRequestPin = async () => {
    setIsEmergencyLoading(true)
    setEmergencyError("")
    try {
      const token = localStorage.getItem("token")
      // Esta ruta debe coincidir con la que crees en tu backend para solicitarPinCorreo
      const res = await fetch(`${api}/api/access/request-pin`, { 
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      })
      
      if (res.ok) {
        setEmergencyStep("input") // Cambiamos la vista a la entrada del PIN
      } else {
        const data = await res.json()
        setEmergencyError(data.mensaje || "Error al solicitar el código")
      }
    } catch (e) {
      setEmergencyError("Error de red al conectar con el servidor")
    } finally {
      setIsEmergencyLoading(false)
    }
  }

  const handleSubmitPin = async () => {
    if (!emailPin || emailPin.length < 6) {
      setEmergencyError("Ingresa el código completo de 6 dígitos")
      return
    }

    setIsEmergencyLoading(true)
    setEmergencyError("")
    try {
      const token = localStorage.getItem("token")
      // Esta ruta debe coincidir con abrirLockerRemoto en el backend
      const res = await fetch(`${api}/api/access/remote-unlock`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ pin_ingresado: emailPin })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("¡Locker abierto exitosamente!"); 
        closeEmergencyModal()
      } else {
        setEmergencyError(data.mensaje || "Código incorrecto o expirado")
      }
    } catch (e) {
      setEmergencyError("Error de conexión al intentar abrir")
    } finally {
      setIsEmergencyLoading(false)
    }
  }

  const closeEmergencyModal = () => {
    setShowEmergencyModal(false)
    setEmergencyStep("request")
    setEmailPin("")
    setEmergencyError("")
  }

  // ---------- Estilos compartidos (solo presentación) ----------
  const pageStyle = { minHeight: "100vh", paddingBottom: "90px", background: "#f8f9fb", color: colors.textMain, fontFamily: "'Roboto', sans-serif" }
  const headerStyle = { background: colors.primary, color: "white", padding: "56px 16px 36px" }
  const h1Style = { fontFamily: "'Montserrat', sans-serif", fontSize: 22, fontWeight: 700, margin: 0 }
  const subtitleStyle = { opacity: 0.85, fontSize: 13, margin: "4px 0 0" }
  const cardStyle = { borderRadius: 16, border: "none", boxShadow: "0 8px 16px rgba(0,0,0,0.06)", overflow: "hidden" }
  const primaryBtn = (disabled) => ({
    width: "100%", height: 48, borderRadius: "12px", border: "none",
    background: colors.primary, color: "white",
    fontFamily: "'Montserrat', sans-serif", fontWeight: "700",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    ...(disabled ? { opacity: 0.6, cursor: "not-allowed" } : { cursor: "pointer" })
  })

  const focusStyles = `
    .access-screen button:focus-visible {
      outline: 2px solid ${colors.secondary};
      outline-offset: 2px;
    }
    .access-screen header button:focus-visible { outline-color: #ffffff; }
    @media (prefers-reduced-motion: reduce) {
      .access-screen * { transition-duration: 0.01ms !important; }
    }
  `

  // 1. CARGA INICIAL
  if (isRefreshing && !qrValue) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", background: "#f8f9fb" }}
      >
        <Loader2 size={40} color={colors.primary} className="animate-spin" />
        <span style={{ fontSize: 14, color: colors.textSecondary, fontFamily: "'Roboto', sans-serif" }}>
          Cargando información...
        </span>
      </div>
    )
  }

  // 2. SIN QR: la pantalla queda bloqueada y se explica qué hacer
  if (!qrValue) {

    // Tiene casillero pero el QR no se pudo generar → se puede reintentar
    const canRetry = hasAssignment && Boolean(error)

    return (
      <div className="access-screen" style={pageStyle}>
        <header style={headerStyle}>
          <h1 style={h1Style}>Código de Acceso</h1>
          <p style={subtitleStyle}>
            {canRetry ? "No pudimos generar tu código" : "Disponible cuando tengas un casillero"}
          </p>
        </header>

        <main style={{ padding: "0 16px", marginTop: -20 }}>
          <Card style={cardStyle}>
            <CardContent style={{ padding: 24, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: canRetry ? `${colors.error}15` : colors.backgroundSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                {canRetry
                  ? <AlertCircle size={28} color={colors.error} />
                  : <Lock size={28} color={colors.primary} />}
              </div>

              <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 700, color: colors.textMain, margin: "0 0 8px" }}>
                {canRetry ? "Código no disponible" : "Acceso no disponible"}
              </h2>

              <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.5, margin: "0 0 24px" }}>
                {canRetry
                  ? `${error}. "Solicita un casillero o espera a que te asignen uno para poder continuar en esta pantalla."`
                  : "Solicita un casillero o espera a que te asignen uno para poder continuar en esta pantalla."}
              </p>

              {canRetry ? (
                <Button onClick={() => fetchNewToken()} style={primaryBtn(false)}>
                  <RefreshCw size={18} />
                  Reintentar
                </Button>
              ) : (
                <Button onClick={() => onNavigate("request")} style={primaryBtn(false)}>
                  Solicitar Ahora
                </Button>
              )}
            </CardContent>
          </Card>
        </main>

        <style>{focusStyles}</style>
      </div>
    )
  }

  // 3. PANTALLA NORMAL (hay QR)
  return (
    <div className="access-screen" style={pageStyle}>
      <Toaster position="top-center" reverseOrder={false} />

      <header style={headerStyle}>
        <h1 style={h1Style}>Código de Acceso</h1>
        <p style={subtitleStyle}>
          Válido para el casillero: {lockerData.numero || "..."}
        </p>
      </header>

      <main style={{ padding: "0 16px", marginTop: -20 }}>
        <Card style={cardStyle}>

          {/* Franja superior: mismo patrón que "Mi locker" del Home */}
          <div style={{ background: colors.secondary, padding: "8px 16px", color: "white", display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={12} />
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px" }}>
              Mi locker
            </span>
          </div>

          <CardContent style={{ padding: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: colors.primary, fontFamily: "'Montserrat', sans-serif", margin: 0 }}>
                {lockerData.numero ? `Locker ${lockerData.numero}` : "Cargando..."}
              </h2>
              {lockerData.ubicacion && (
                <p style={{ fontSize: 14, color: colors.textSecondary, margin: "4px 0 0" }}>
                  {lockerData.ubicacion}
                </p>
              )}
              {!error && (
                <p style={{ fontSize: 13, color: colors.success, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, margin: "10px 0 0" }}>
                  <CheckCircle2 size={16} /> Sistema activo
                </p>
              )}
            </div>

            {/* MENSAJE DE ERROR (conserva el último QR; antes el error no se mostraba) */}
            {error && (
              <div
                role="alert"
                style={{ display: "flex", alignItems: "flex-start", gap: 10, background: `${colors.error}15`, borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}
              >
                <AlertCircle size={18} color={colors.error} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: colors.textMain, margin: 0, lineHeight: 1.5 }}>
                  {error}. Toca "Actualizar Código QR" para intentarlo de nuevo.
                </p>
              </div>
            )}

            {/* SECCIÓN QR */}
            <div
              role="img"
              aria-label="Código QR de acceso a tu casillero"
              style={{ position: "relative", background: "white", padding: 20, borderRadius: 16, border: `2px solid ${colors.backgroundSoft}`, display: "flex", justifyContent: "center", minHeight: "220px", alignItems: "center" }}
            >
              <div style={{ opacity: isRefreshing ? 0.2 : 1, transition: "opacity 0.3s" }}>
                <QRCode value={qrValue} size={180} level="H" bgColor="#ffffff" fgColor={colors.primary} />
              </div>
              {isRefreshing && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 size={32} color={colors.primary} className="animate-spin" />
                </div>
              )}
            </div>

            {/* TIEMPO RESTANTE: mismo patrón que "Tiempo restante" del Home */}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={16} color={countdown <= 10 ? colors.error : colors.success} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Se actualiza en</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: countdown <= 10 ? colors.error : colors.success }}>{countdown}s</span>
              </div>
              <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(countdown / 60) * 100}%`, background: countdown <= 10 ? colors.error : colors.success, transition: "width 1s linear" }} />
              </div>
            </div>

            <Button
              onClick={() => fetchNewToken()}
              disabled={isRefreshing}
              style={{ width: "100%", marginTop: 20, height: 48, borderRadius: "12px", border: "none", color: colors.primary, fontFamily: "'Montserrat', sans-serif", fontWeight: "700", background: colors.backgroundSoft, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, ...(isRefreshing ? { opacity: 0.6, cursor: "not-allowed" } : { cursor: "pointer" }) }}
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Actualizando..." : "Actualizar Código QR"}
            </Button>
          </CardContent>
        </Card>

        {/* MODOS DE APERTURA: mismo patrón de fila que "Actividad Reciente" */}
        <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 700, color: colors.textMain, margin: "20px 0 12px 4px" }}>
          Modos de Apertura
        </h3>

        <Card style={{ borderRadius: 16, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <CardContent style={{ padding: "8px 16px" }}>

            {/* Escáner QR */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 0", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${colors.primary}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <QrCode size={18} color={colors.primary} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Escáner QR (recomendado)</p>
                <p style={{ fontSize: 12, color: colors.textSecondary, margin: "2px 0 0", lineHeight: 1.5 }}>
                  Sube el brillo de tu pantalla al máximo y acerca el código al lector del casillero.
                </p>
              </div>
            </div>

            {/* Apertura remota */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 0" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${colors.warning}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <KeyRound size={18} color={colors.warning} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Apertura remota (emergencia)</p>
                <p style={{ fontSize: 12, color: colors.textSecondary, margin: "2px 0 12px", lineHeight: 1.5 }}>
                  Si el lector está sucio o dañado, recibirás por correo un código de un solo uso para abrirlo desde aquí.
                </p>
                <Button
                  onClick={() => setShowEmergencyModal(true)}
                  style={{ width: "100%", height: 48, borderRadius: "12px", border: "none", cursor: "pointer", color: colors.textMain, fontFamily: "'Montserrat', sans-serif", fontWeight: "700", background: `${colors.warning}15`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <KeyRound size={18} color={colors.warning} />
                  Apertura Remota
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>
      </main>

      {/* --- MODAL DE APERTURA DE EMERGENCIA --- */}
      {showEmergencyModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", 
          backgroundColor: "rgba(12, 25, 45, 0.45)", backdropFilter: "blur(3px)", zIndex: 999, display: "flex", 
          alignItems: "center", justifyContent: "center", padding: "16px"
        }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Apertura remota de emergencia"
            style={{
              background: "white", width: "100%", maxWidth: "400px", borderRadius: "16px", 
              padding: "24px", position: "relative", boxShadow: "0 8px 16px rgba(0,0,0,0.06)"
            }}
          >
            <button 
              onClick={closeEmergencyModal}
              aria-label="Cerrar"
              title="Cerrar"
              style={{ position: "absolute", top: "12px", right: "12px", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f5f7", borderRadius: "10px", border: "none", cursor: "pointer", color: colors.textMain }}
            >
              <X size={18} />
            </button>

            {emergencyStep === "request" ? (
              <div style={{ textAlign: "center", paddingTop: "8px" }}>
                <div style={{ width: 48, height: 48, background: `${colors.warning}20`, color: colors.warning, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Mail size={24} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: "700", color: colors.textMain, margin: "0 0 8px", fontFamily: "'Montserrat', sans-serif" }}>
                  Validación de Seguridad
                </h3>
                <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.5, margin: "0 0 24px" }}>
                  Para abrir el casillero remotamente, enviaremos un código temporal de 6 dígitos a tu correo institucional.
                </p>
                {emergencyError && <p role="alert" style={{ color: colors.error, fontSize: 13, margin: "0 0 16px" }}>{emergencyError}</p>}
                
                <Button 
                  onClick={handleRequestPin} 
                  disabled={isEmergencyLoading}
                  style={primaryBtn(isEmergencyLoading)}
                >
                  {isEmergencyLoading ? <Loader2 size={18} className="animate-spin" /> : "Enviar Código a mi Correo"}
                </Button>
              </div>
            ) : (
              <div style={{ textAlign: "center", paddingTop: "8px" }}>
                <div style={{ width: 48, height: 48, background: `${colors.primary}20`, color: colors.primary, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <KeyRound size={24} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: "700", color: colors.textMain, margin: "0 0 8px", fontFamily: "'Montserrat', sans-serif" }}>
                  Ingresa tu Código
                </h3>
                <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.5, margin: "0 0 20px" }}>
                  Revisa tu correo (incluyendo SPAM). El código expira en 5 minutos.
                </p>
                
                <input 
                  type="text" 
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="Código de 6 dígitos"
                  maxLength={6}
                  value={emailPin}
                  onChange={(e) => setEmailPin(e.target.value.replace(/\D/g, ''))} // Solo permite números
                  onKeyDown={(e) => { if (e.key === "Enter" && emailPin.length === 6 && !isEmergencyLoading) handleSubmitPin() }}
                  onFocus={(e) => e.currentTarget.style.borderColor = colors.primary}
                  onBlur={(e) => e.currentTarget.style.borderColor = colors.backgroundSoft}
                  placeholder="000000"
                  style={{
                    width: "100%", height: 56, fontSize: "28px", letterSpacing: "8px", 
                    textAlign: "center", borderRadius: "12px", border: `2px solid ${colors.backgroundSoft}`,
                    marginBottom: 16, outline: "none", color: colors.textMain, fontWeight: "bold",
                    boxSizing: "border-box", transition: "border-color 0.2s ease"
                  }}
                />

                {emergencyError && <p role="alert" style={{ color: colors.error, fontSize: 13, margin: "0 0 16px" }}>{emergencyError}</p>}

                <Button 
                  onClick={handleSubmitPin} 
                  disabled={isEmergencyLoading || emailPin.length < 6}
                  style={primaryBtn(isEmergencyLoading || emailPin.length < 6)}
                >
                  {isEmergencyLoading ? <Loader2 size={18} className="animate-spin" /> : "Abrir Casillero Remotamente"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{focusStyles}</style>
    </div>
  )
}
