"use client"

import { useState, useEffect } from "react";
import { User, Mail, Shield, Edit3, Box, X, Phone, Building2, Scale, Info, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import Button from "../ui/button";
import toast, { Toaster } from "react-hot-toast";
import { logout } from "../../services/authService";
const api = import.meta.env.VITE_API_URL;

export function ProfileScreen({ onLogout }) {
  const [user, setUser] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showConfirmDesalojo, setShowConfirmDesalojo] = useState(false); // Nuevo Modal UI
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nombre_completo: "", carrera: "" });

  const colors = {
    primary: "#0b4dbb",
    warning: "#f2b705",
    error: "#c94a4a",
    textSec: "#8a8a8a",
    success: "#2fa4a9"
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${api}/api/perfil/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUser(data);
      setFormData({ nombre_completo: data.nombre_completo, carrera: data.carrera || "" });
    } catch (e) { toast.error("Error al cargar perfil"); }
  };

  // Lógica de Desalojo Correcta
  const handleDesalojar = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${api}/api/perfil/desalojar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();

      if (res.ok) {
        toast.success("Casillero liberado correctamente");
        setShowConfirmDesalojo(false);

        setTimeout(() => {
            window.location.reload(); 
        }, 1500);

      } else {
        toast.error(data.error || "No se pudo desalojar");
      }
    } catch (err) {
      toast.error("Error de conexión con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
  // 1. Borramos el token del almacenamiento local
  localStorage.removeItem("token");
  
  // 2. Opcional: Si guardas datos del usuario decodificados, límpialos también
  // localStorage.removeItem("user_data");

  // 3. Redirección forzada al login para limpiar el estado de React
  window.location.href = "/login"; 
};

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "110px", background: "#f8f9fb", fontFamily: "'Roboto', sans-serif" }}>
      <Toaster position="top-center" />
      
      {/* Header Estilo UTEQ (Recto por decisión de diseño previa) */}
      <header style={{ background: colors.primary, color: "white", padding: "60px 16px 40px", textAlign: "center" }}>
        <div style={{ width: "85px", height: "85px", borderRadius: "50%", background: "white", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid rgba(255,255,255,0.3)" }}>
          <User size={45} color={colors.primary} />
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
          {user?.nombre_completo || "Cargando..."}
        </h2>
        <p style={{ fontSize: "14px", opacity: 0.9 }}>Matrícula: {user?.matricula}</p>
      </header>

      <main style={{ padding: "0 16px", marginTop: "-20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Información Personal */}
        <Card style={{ borderRadius: "16px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <CardContent style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
              <span style={{ fontWeight: 700, fontSize: "14px", color: colors.primary, fontFamily: "'Montserrat', sans-serif" }}>Datos de Usuario</span>
              <Edit3 size={18} onClick={() => setIsEditing(!isEditing)} style={{ cursor: 'pointer', color: colors.primary }} />
            </div>
            
            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <input 
                  style={{ padding: "12px", borderRadius: "10px", border: "1px solid #ddd", fontSize: "14px" }} 
                  value={formData.nombre_completo} 
                  onChange={e => setFormData({...formData, nombre_completo: e.target.value})} 
                />
                <select 
                  style={{ padding: "12px", borderRadius: "10px", border: "1px solid #ddd", fontSize: "14px", background: "white" }} 
                  value={formData.carrera} 
                  onChange={e => setFormData({...formData, carrera: e.target.value})}
                >
                   <option value="División Económica-Administrativa">División Económica-Administrativa</option>
                   <option value="División Industrial">División Industrial</option>
                   <option value="Desarrollo de Negocios">Desarrollo de Negocios</option>
                   <option value="División Ambiental">División Ambiental</option>
                   <option value="División de Idiomas">División de Idiomas</option>
                   <option value="División de Tecnologías de Automatización e Información">División de Tecnologías</option>
                </select>
                <Button 
                  onClick={async () => {
                    const token = localStorage.getItem("token");
                    await fetch(`${api}/api/perfil/update`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify(formData)
                    });
                    setIsEditing(false);
                    fetchUserData();
                    toast.success("Perfil actualizado");
                  }} 
                  style={{ background: colors.primary, color: "white", height: "48px", borderRadius: "12px", fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}
                >
                  Guardar Cambios
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Building2 size={18} color={colors.primary} />
                  <span style={{ fontSize: "14px", color: "#444" }}>{user?.carrera || "División no asignada"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Mail size={18} color={colors.primary} />
                  <span style={{ fontSize: "14px", color: "#444" }}>{user?.email}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botón Desalojar Profesional */}
       <Button 
  onClick={() => setShowConfirmDesalojo(true)} 
  style={{ 
    // Colores y Tipografía oficial
    background: colors.primary, 
    color: "white", 
    fontFamily: "'Montserrat', sans-serif",
    fontSize: "15px", 
    fontWeight: 700, 
    
    // Dimensiones y Forma
    width: "100%", // Ocupa todo el ancho como tus otros botones
    height: "60px", 
    borderRadius: "16px", 
    border: "none", 
    
    // Alineación Perfecta
    display: "flex", 
    alignItems: "center",     // Centra verticalmente
    justifyContent: "center",  // Centra horizontalmente el contenido
    gap: "12px",               // Espacio entre icono y texto
    
    // Sombra sutil (según Pág 13 de tu guía)
    boxShadow: "0 6px 20px rgba(11, 77, 187, 0.25)",
    
    // Interacción
    cursor: "pointer",
    transition: "all 0.2s ease"
  }}
>
  <Box size={22} /> 
  <span style={{ letterSpacing: "0.5px" }}>Desalojar Casillero</span>
</Button>

        {/* Soporte y Legal */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <button onClick={() => setShowPrivacy(true)} style={{ padding: "18px", background: "white", borderRadius: "18px", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.04)" }}>
            <Shield color={colors.primary} size={24} />
            <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>Privacidad</span>
          </button>
          <a href="mailto:interlockerupsoporte@gmail.com" style={{ textDecoration: "none", color: "inherit", padding: "18px", background: "white", borderRadius: "18px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.04)" }}>
            <Mail color={colors.success} size={24} />
            <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>Soporte</span>
          </a>
        </div>

        <div style={{ textAlign: "center", marginTop: "10px" }}>
           <p style={{ fontSize: "12px", color: colors.textSec, marginBottom: "8px" }}>Central UTEQ: 442 209 6100</p>
          <button 
        onClick={handleLogout} // Conectamos la función
        style={{ 
          color: colors.error, // Usando tu objeto de tema (IDGS17)
          background: "none", 
          border: "none", 
          fontWeight: 700, 
          padding: "10px", 
          fontSize: "14px", 
          fontFamily: "'Montserrat', sans-serif",
          cursor: "pointer", 
          width: "100%", 
          textAlign: "left" 
        }}
      >
        Cerrar Sesión
      </button>
        </div>
      </main>

      {/* MODAL DE CONFIRMACIÓN DE DESALOJO (En lugar del Alert default) */}
      {showConfirmDesalojo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "24px", width: "100%", maxWidth: "340px", padding: "24px", textAlign: "center", animation: "scaleUp 0.3s ease" }}>
            <div style={{ width: "60px", height: "60px", background: `${colors.error}15`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertTriangle color={colors.error} size={30} />
            </div>
            <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: "18px", marginBottom: "10px" }}>¿Estás seguro?</h3>
            <p style={{ fontSize: "14px", color: colors.textSec, lineHeight: "1.5", marginBottom: "24px" }}>
              Esta acción liberará el casillero. Si es un uso compartido, solo se cancelará tu acceso individual.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Button 
                onClick={handleDesalojar} 
                disabled={isSubmitting}
                style={{ background: colors.error, color: "white", height: "48px", borderRadius: "12px", fontWeight: 700 }}
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "SÍ, DESALOJAR"}
              </Button>
              <button 
                onClick={() => setShowConfirmDesalojo(false)}
                style={{ background: "transparent", border: "none", color: colors.textSec, padding: "10px", fontWeight: 600, fontSize: "14px" }}
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos de animación y fuentes */}
      <style jsx>{`
        @keyframes scaleUp {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Modal de Privacidad (Igual que el anterior pero con fuentes corregidas) */}
      
           
      {/* Modal Aviso de Privacidad Completo */}
      {showPrivacy && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "white", width: "100%", height: "90%", borderTopLeftRadius: "25px", borderTopRightRadius: "25px", padding: "24px", overflowY: "auto", position: "relative" }}>
            <div style={{ position: "sticky", top: 0, background: "white", paddingBottom: "15px", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee" }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: colors.primary }}>Documentación Legal</h3>
              <X onClick={() => setShowPrivacy(false)} style={{ cursor: "pointer" }} />
            </div>
            
            <div style={{ fontSize: "13px", lineHeight: "1.6", color: "#444", textAlign: "justify", marginTop: "20px" }}>
              <section>
                <h4 style={{ color: colors.primary, marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}><Shield size={16}/> Aviso de Privacidad</h4>
                <p><strong>InterLockerUp</strong>, con domicilio institucional en Avenida Pie de la Cuesta 2600, 76140 Santiago de Querétaro, Qro., es responsable de la recopilación, almacenamiento, uso y protección de los datos personales.</p>
                
                <p><strong>Finalidades:</strong><br/>
                1. Asegurar el acceso y funcionamiento del sistema.<br/>
                2. Registro de uso por alumnos.<br/>
                3. Generación de códigos QR.<br/>
                4. Notificaciones de vencimiento.<br/>
                5. Auditorías y control administrativo.</p>

                <p><strong>Datos Recabados:</strong> Nombre completo, Matrícula, Grupo, Correo institucional y Contraseña (cifrada).</p>
                
                <p><strong>Derechos ARCO:</strong> Usted tiene derecho al Acceso, Rectificación, Cancelación u Oposición de sus datos. Puede ejercerlos en el área administrativa del <strong>Edificio K de la UTEQ</strong> o vía correo en <strong>interlockerupsoporte@gmail.com</strong>.</p>
              </section>

              <hr style={{ margin: "20px 0", border: "0", borderTop: "1px solid #eee" }} />

              <section>
                <h4 style={{ color: colors.primary, marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}><Scale size={16}/> Deslinde de Responsabilidad</h4>
                <p><strong>Uso Autorizado:</strong> El software debe usarse exclusivamente para fines académicos. Queda prohibido cualquier uso comercial, ilícito o que comprometa la seguridad física de los lockers.</p>
                
                <p><strong>Propiedad Intelectual:</strong> InterLockerUp y su arquitectura técnica están protegidos por la Ley Federal del Derecho de Autor. Se prohíbe la ingeniería inversa o reproducción del sistema.</p>

                <p><strong>Limitación de Responsabilidad:</strong> La plataforma no se hace responsable por daños, pérdidas de pertenencias físicas o afectaciones derivadas del uso indebido, negligencia al dejar el locker abierto o compartir códigos QR.</p>
              </section>

              <div style={{ background: "#f0f4f8", padding: "15px", borderRadius: "12px", marginTop: "20px" }}>
                <p style={{ fontSize: "11px", margin: 0 }}>
                  <strong>Última actualización:</strong> 13 de febrero de 2026<br/>
                  <strong>Marco Legal:</strong> LFPDPPP (Reforma Nov 2025) y Código Penal Federal.
                </p>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}