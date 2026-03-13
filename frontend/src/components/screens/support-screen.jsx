"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Camera, Send, Check, AlertTriangle, Wrench, HelpCircle, Lock, Loader2, X } from "lucide-react"
import { Card, CardContent } from "../ui/card"
import Button from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"

const api = import.meta.env.VITE_API_URL;

// Paleta oficial IDGS17
const theme = {
  primary: "#0b4dbb",
  secondary: "#1f78ff",
  success: "#2fa4a9",
  warning: "#f2b705",
  error: "#c94a4a",
  bgLight: "#eaf2ff",
  white: "#ffffff",
  textMain: "#2e2e2e",
  textSec: "#8a8a8a",
}

const categories = [
  { id: "damage", label: "Daño", icon: AlertTriangle, color: theme.error, bg: "#fee2e2" },
  { id: "access", label: "Acceso", icon: Lock, color: theme.warning, bg: "#fef9c3" },
  { id: "maintenance", label: "Mantenimiento", icon: Wrench, color: theme.primary, bg: "#dbeafe" },
  { id: "other", label: "Otro", icon: HelpCircle, color: theme.success, bg: "#d1fae5" },
]

export default function SupportScreen() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [lockerNumber, setLockerNumber] = useState("")
  const [lockerId, setLockerId] = useState(null)
  const [description, setDescription] = useState("")
  const [file, setFile] = useState(null)
  const [photoName, setPhotoName] = useState(null)
  const [isLoadingLocker, setIsLoadingLocker] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  // Estado para el Toast personalizado
  const [toast, setToast] = useState({ show: false, message: "", type: "error" })
  
  const fileInputRef = useRef(null)

  const showToast = (message, type = "error") => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ ...toast, show: false }), 4000)
  }

  const cargarLockerActual = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${api}/api/perfil/my-locker`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && data.numero) {
        setLockerNumber(data.numero);
        setLockerId(data.id);
      }
    } catch (err) {
      console.error("Error al cargar locker:", err);
    } finally {
      setIsLoadingLocker(false);
    }
  }, []);

  useEffect(() => { cargarLockerActual(); }, [cargarLockerActual]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCategory || !description || !lockerId) {
      showToast("Por favor, completa todos los campos obligatorios.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      let userId = null;
      if (token) {
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        userId = decodedPayload.id;
      }

      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("lockerId", lockerId);
      formData.append("categoria", selectedCategory);
      formData.append("descripcion", description);
      if (file) formData.append("evidencia", file);

      const response = await fetch(`${api}/api/incidents/reportar`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        showToast(data.mensaje || "Error al procesar el reporte");
      }
    } catch (error) {
      showToast("Error de conexión con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div style={{ minHeight: "100vh", paddingBottom: "90px", background: "#f8f9fb", fontFamily: "'Roboto', sans-serif" }}>
        <header style={{ background: theme.success, color: theme.white, padding: "56px 16px 32px" }}>
          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "24px", fontWeight: 600, margin: 0 }}>Reporte Enviado</h1>
        </header>
        <main style={{ padding: "0 16px", marginTop: "-20px" }}>
          <Card style={{ borderRadius: "16px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            <CardContent style={{ padding: "32px 24px", textAlign: "center" }}>
              <div style={{ width: "80px", height: "80px", margin: "0 auto 20px", background: `${theme.success}20`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={40} color={theme.success} />
              </div>
              <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "20px", fontWeight: 600, color: theme.textMain, marginBottom: "8px" }}>¡Registro Exitoso!</h2>
              <p style={{ fontSize: "14px", color: theme.textSec, lineHeight: "1.6", marginBottom: "32px" }}>
                Tu incidencia ha sido recibida correctamente. El equipo técnico revisará el caso a la brevedad.
              </p>

              <Button onClick={() => {
                setIsSubmitted(false);
                setSelectedCategory(null);
                setDescription("");
                setFile(null);
                setPhotoName(null);
              }} style={{ width: "100%", height: "48px", borderRadius: "12px", background: theme.primary, color: theme.white, fontWeight: 600, fontFamily: "'Montserrat', sans-serif", border: "none" }}>
                Volver a Soporte
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "90px", background: "#f8f9fb", fontFamily: "'Roboto', sans-serif" }}>
      
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: "fixed", top: "20px", left: "16px", right: "16px", zIndex: 100,
          background: toast.type === "error" ? theme.error : theme.warning,
          color: theme.white, padding: "12px 16px", borderRadius: "12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 8px 16px rgba(0,0,0,0.15)", animation: "slideIn 0.3s ease"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={18} />
            <span style={{ fontSize: "14px", fontWeight: 500 }}>{toast.message}</span>
          </div>
          <X size={18} onClick={() => setToast({ ...toast, show: false })} />
        </div>
      )}

      <header style={{ background: theme.primary, color: theme.white, padding: "56px 16px 32px" }}>
        <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "24px", fontWeight: 600, margin: 0 }}>Reportar Incidente</h1>
        <p style={{ fontSize: "14px", opacity: 0.9, marginTop: "4px" }}>Módulo de soporte técnico UTEQ</p>
      </header>

      <main style={{ padding: "0 16px", marginTop: "-20px" }}>
        <Card style={{ borderRadius: "16px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          <CardContent style={{ padding: "24px" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Label style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "14px", fontWeight: 600 }}>Tipo de incidente</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)}
                        style={{ padding: "16px", borderRadius: "12px", border: `2px solid ${isSelected ? cat.color : "#f0f0f0"}`, background: isSelected ? cat.bg : theme.white, textAlign: "left", transition: "all 0.2s ease", cursor: "pointer" }}>
                        <cat.icon size={20} color={isSelected ? cat.color : theme.textSec} style={{ marginBottom: "8px" }} />
                        <span style={{ display: "block", fontSize: "13px", fontWeight: 600, fontFamily: "'Montserrat', sans-serif", color: isSelected ? cat.color : theme.textMain }}>{cat.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <Label style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "14px", fontWeight: 600 }}>Casillero asociado</Label>
                <Input readOnly value={lockerNumber} placeholder={isLoadingLocker ? "Cargando..." : "Sin casillero asignado"} 
                  style={{ height: "48px", borderRadius: "10px", border: "1px solid #ddd", background: "#f9f9f9", fontSize: "15px" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <Label style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "14px", fontWeight: 600 }}>Descripción del problema</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="¿Qué sucedió con tu casillero?" 
                  style={{ minHeight: "100px", borderRadius: "10px", border: "1px solid #ddd", padding: "12px", resize: "none", fontSize: "14px" }} />
              </div>

              <div style={{ marginTop: "8px" }}>
                <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} 
                  onChange={(e) => { 
                    if (e.target.files[0]) {
                      setFile(e.target.files[0]); 
                      setPhotoName(e.target.files[0].name);
                    }
                  }} 
                />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    width: "100%", padding: "16px", border: `2px dashed ${photoName ? theme.success : "#ddd"}`, 
                    borderRadius: "12px", background: photoName ? `${theme.success}10` : "transparent", 
                    color: photoName ? theme.success : theme.textSec, display: "flex", flexDirection: "column", 
                    alignItems: "center", gap: "8px", cursor: "pointer" 
                  }}
                >
                  {photoName ? <Check size={20} /> : <Camera size={20} />}
                  <span style={{ fontSize: "13px", fontWeight: 500 }}>{photoName || "Adjuntar evidencia (opcional)"}</span>
                </button>
              </div>

              <Button type="submit" disabled={isSubmitting}
                style={{ 
                  width: "100%", height: "52px", marginTop: "8px", borderRadius: "12px", 
                  background: theme.primary, color: theme.white, fontFamily: "'Montserrat', sans-serif", 
                  fontWeight: 600, fontSize: "16px", border: "none", display: "flex", 
                  alignItems: "center", justifyContent: "center", gap: "10px", 
                  cursor: isSubmitting ? "not-allowed" : "pointer" 
                }}>
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                {isSubmitting ? "Enviando..." : "Enviar Reporte"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div style={{ marginTop: "24px", padding: "0 8px" }}>
          <p style={{ fontSize: "12px", color: theme.textSec, lineHeight: "1.4", textAlign: "center" }}>
            Al enviar este reporte, notificas directamente al departamento de mantenimiento para agilizar la reparación.
          </p>
        </div>
      </main>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}