"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Lock, Loader2, CheckCircle2, Clock, QrCode, KeyRound, X, Mail } from "lucide-react"
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

  if (isRefreshing && !qrValue) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fb" }}>
        <Loader2 size={40} color={colors.primary} className="animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "90px", background: "#f8f9fb", fontFamily: "'Roboto', sans-serif" }}>
      <Toaster position="top-center" reverseOrder={false} />
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

            <Button onClick={() => fetchNewToken()} disabled={isRefreshing} style={{ width: "100%", marginTop: 24, height: 50, borderRadius: "12px", border: "none", color: colors.primary, fontWeight: "700", background: colors.backgroundSoft, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              Actualizar Código QR
            </Button>

            <hr style={{ border: "none", height: "1px", background: "#f0f0f0", margin: "24px 0" }} />

            {/* SECCIÓN APERTURA DE EMERGENCIA */}
            <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, color: colors.textMain, fontWeight: 600, marginBottom: 12 }}>
                  ¿Problemas con el escáner del casillero?
                </p>
                <Button 
                  onClick={() => setShowEmergencyModal(true)}
                  style={{ 
                    width: "100%", 
                    height: 44, 
                    borderRadius: "12px", 
                    border: `1px solid ${colors.warning}`, 
                    color: colors.warning, 
                    fontWeight: "600", 
                    background: "transparent", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: 8 
                  }}
                >
                  <KeyRound size={18} />
                  Apertura Remota de Emergencia
                </Button>
            </div>
          </CardContent>
        </Card>

        {/* INSTRUCCIONES ACTUALIZADAS */}
        <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 700, color: colors.textMain, margin: "24px 0 12px 8px" }}>
          Modos de Apertura
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Instrucción QR */}
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
                Opción 1: Escáner QR (Recomendado)
              </strong>
            </div>
            <p style={{ fontSize: 14, margin: 0, color: colors.textMain }}>
              Ajusta el brillo de tu pantalla al máximo y coloca el código QR frente al lector óptico del casillero.
            </p>
          </div>

          {/* Instrucción Emergencia */}
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
                Opción 2: Emergencia (App Web)
              </strong>
            </div>
            <p style={{ fontSize: 14, margin: 0, color: colors.textMain }}>
              Si el lector está sucio o dañado, usa la opción de "Apertura Remota". Recibirás un código de un solo uso por correo para abrirlo desde aquí.
            </p>
          </div>
        </div>
      </main>

      {/* --- MODAL DE APERTURA DE EMERGENCIA --- */}
      {showEmergencyModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", 
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", 
          alignItems: "center", justifyContent: "center", padding: "16px"
        }}>
          <div style={{
            background: "white", width: "100%", maxWidth: "400px", borderRadius: "20px", 
            padding: "24px", position: "relative", boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
          }}>
            <button 
              onClick={closeEmergencyModal}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: colors.textSecondary }}
            >
              <X size={24} />
            </button>

            {emergencyStep === "request" ? (
              <div style={{ textAlign: "center", paddingTop: "8px" }}>
                <div style={{ width: 48, height: 48, background: `${colors.warning}20`, color: colors.warning, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Mail size={24} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: "700", color: colors.textMain, marginBottom: 8, fontFamily: "'Montserrat', sans-serif" }}>
                  Validación de Seguridad
                </h3>
                <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24 }}>
                  Para abrir el casillero remotamente, enviaremos un código temporal de 6 dígitos a tu correo institucional.
                </p>
                {emergencyError && <p style={{ color: colors.error, fontSize: 13, marginBottom: 16 }}>{emergencyError}</p>}
                
                <Button 
                  onClick={handleRequestPin} 
                  disabled={isEmergencyLoading}
                  style={{ width: "100%", height: 48, borderRadius: "12px", background: colors.warning, color: "white", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none" }}
                >
                  {isEmergencyLoading ? <Loader2 size={18} className="animate-spin" /> : "Enviar Código a mi Correo"}
                </Button>
              </div>
            ) : (
              <div style={{ textAlign: "center", paddingTop: "8px" }}>
                <div style={{ width: 48, height: 48, background: `${colors.primary}20`, color: colors.primary, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <KeyRound size={24} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: "700", color: colors.textMain, marginBottom: 8, fontFamily: "'Montserrat', sans-serif" }}>
                  Ingresa tu Código
                </h3>
                <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}>
                  Revisa tu correo (incluyendo SPAM). El código expira en 5 minutos.
                </p>
                
                <input 
                  type="text" 
                  maxLength={6}
                  value={emailPin}
                  onChange={(e) => setEmailPin(e.target.value.replace(/\D/g, ''))} // Solo permite números
                  placeholder="000000"
                  style={{
                    width: "100%", height: 56, fontSize: "28px", letterSpacing: "8px", 
                    textAlign: "center", borderRadius: "12px", border: `2px solid ${colors.backgroundSoft}`,
                    marginBottom: 16, outline: "none", color: colors.textMain, fontWeight: "bold"
                  }}
                />

                {emergencyError && <p style={{ color: colors.error, fontSize: 13, marginBottom: 16 }}>{emergencyError}</p>}

                <Button 
                  onClick={handleSubmitPin} 
                  disabled={isEmergencyLoading || emailPin.length < 6}
                  style={{ width: "100%", height: 48, borderRadius: "12px", background: colors.primary, color: "white", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none" }}
                >
                  {isEmergencyLoading ? <Loader2 size={18} className="animate-spin" /> : "Abrir Casillero Remotamente"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}