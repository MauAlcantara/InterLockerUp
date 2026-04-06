"use client"

import { useState, useEffect, useCallback } from "react";
import { Bell, Lock, Clock, LogOut, User, Unlock, ChevronRight, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import Button from "../ui/button";
import { logout } from "../../services/authService";
const api = import.meta.env.VITE_API_URL;

export default function HomeScreen({ onNavigate, onLogout }) {
  const [user, setUser] = useState(null);
  const [locker, setLocker] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotis, setShowNotis] = useState(false);
  const [isLoadingNotis, setIsLoadingNotis] = useState(false);

  const colors = {
    primary: "#0b4dbb",
    secondary: "#1f78ff",
    success: "#2fa4a9",
    warning: "#f2b705",
    error: "#c94a4a",
    background: "#eaf2ff",
    text: "#2e2e2e",
    textSecondary: "#8a8a8a"
  };

  // 1. CARGAR NOTIFICACIONES
  const cargarNotificaciones = useCallback(async () => {
    setIsLoadingNotis(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${api}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setNotifications(data);
    } catch (err) {
      console.error("Error notificaciones:", err);
    } finally {
      setIsLoadingNotis(false);
    }
  }, []);

  // 2. CARGAR HISTORIAL (Lógica que recordabas)
  const cargarHistorialReciente = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${api}/api/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      const formatted = [];
      if (data.requests) {
        data.requests.forEach(r => {
          formatted.push({
            id: "req_" + r.id,
            action: "Solicitud enviada",
            time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            icon: Lock,
            color: colors.warning
          });
        });
      }

      if (data.access_logs) {
        data.access_logs.forEach(log => {
          formatted.push({
            id: "log_" + log.id,
            action: log.accion,
            time: new Date(log.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            icon: Unlock,
            color: colors.primary
          });
        });
      }

      setRecentActivity(formatted.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 3));
    } catch (err) {
      console.error("Error cargando actividad:", err);
    }
  }, [colors.warning, colors.primary]);

  // 3. CARGA INICIAL COMPLETA
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${api}/api/perfil/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error("Sesión expirada");
        return res.json();
      })
      .then(data => setUser(data))
      .catch(err => {
        console.error("Error de sesión:", err);
        localStorage.removeItem("token");
        window.location.href = "/login";
      });

    fetch(`${api}/api/perfil/my-locker`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {

        // 1. Si el backend responde con un null o vacío, no hacemos nada y evitamos el error
        if (!data) return;

        // 2. El backend puede enviar los datos directos o envueltos en un objeto llamado "locker"
        const lockerData = data.locker !== undefined ? data.locker : data;

        // 3. Si definitivamente no hay casillero asignado, nos detenemos
        if (!lockerData) return;

        // 4. Extraemos el número de forma segura (con el nombre que sea que use el backend)
        const numeroLocker = lockerData.numero || lockerData.identificador || lockerData.number;
        
        if (numeroLocker) {
          setLocker({
            number: numeroLocker,
            timeLeft: lockerData.timeLeft || 14400,
            totalTime: lockerData.totalTime || 14400,
            building: lockerData.edificio || lockerData.building || "Edificio asignado",
            floor: lockerData.piso || lockerData.floor || "Planta Baja"
          });
        }
      })
      .catch(err => console.error("No se encontró locker activo", err));

    cargarHistorialReciente();
    cargarNotificaciones();
  }, [cargarHistorialReciente, cargarNotificaciones]);

  const timePercentage = locker ? (locker.timeLeft / locker.totalTime) * 100 : 0;
  const daysLeft = locker ? Math.ceil(locker.timeLeft / 1440) : 0;
  
  const getTimeColor = () => {
    if (timePercentage <= 25) return colors.error;
    if (timePercentage <= 50) return colors.warning;
    return colors.success;
  };

  const recordatorio = notifications.find(n => !n.leida) || notifications[0];

  const handleLogout = () => {
  // 1. Borramos el token del almacenamiento local
  localStorage.removeItem("token");
  
  // 2. Opcional: Si guardas datos del usuario decodificados, límpialos también
  // localStorage.removeItem("user_data");

  // 3. Redirección forzada al login para limpiar el estado de React
  window.location.href = "/login"; 
};

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 90, background: "#f8f9fb", color: colors.text, fontFamily: "'Roboto', sans-serif" }}>
      
      {/* --- HEADER --- */}
      <header style={{ background: colors.primary, color: "white", padding: "56px 16px 36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 13, opacity: 0.85, fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>Hola,</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Montserrat', sans-serif", margin: 0 }}>
              {user ? user.nombre_completo.split(' ')[0] : "Usuario"}
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={() => setShowNotis(true)}
              style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(255,255,255,0.12)", border: "none", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
            >
              <Bell size={20} />
              {notifications.some(n => !n.leida) && (
                <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, background: colors.error, borderRadius: "50%", border: "2px solid #0b4dbb" }} />
              )}
            </button>
            <button onClick={() => onNavigate("profile")} style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(255,255,255,0.12)", border: "none", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={20} />
            </button>
           <button 
  onClick={handleLogout} 
  style={{ 
    width: 40, 
    height: 40, 
    borderRadius: "10px", 
    background: "rgba(255,255,255,0.12)", 
    border: "none", 
    color: "white", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    cursor: "pointer", // Importante para UX
    transition: "background 0.2s ease"
  }}
  // Pequeño efecto visual al pasar el mouse
  onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
  onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
  title="Cerrar sesión"
>
  <LogOut size={20} />
</button>
          </div>
        </div>
      </header>

      <main style={{ padding: "0 16px", marginTop: "-20px", display: "flex", flexDirection: "column", gap: 20 }}>
        
        {/* --- CARD LOCKER --- */}
        <Card style={{ borderRadius: "16px", border: "none", boxShadow: "0 8px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ background: colors.secondary, padding: "8px 16px", color: "white", display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={12} />
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px" }}>Mi locker</span>
          </div>
          <CardContent style={{ padding: "20px" }}>
            {locker ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 26, fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: colors.primary, margin: 0 }}>Locker {locker.number}</h2>
                    <p style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>{locker.building} • {locker.floor}</p>
                  </div>
                  <div style={{ width: 52, height: 52, borderRadius: "14px", background: colors.background, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Lock size={26} color={colors.primary} />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={16} color={getTimeColor()} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Tiempo restante</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: getTimeColor() }}>{daysLeft} días</span>
                  </div>
                  <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${timePercentage}%`, height: "100%", background: getTimeColor(), transition: "width 0.8s ease" }} />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>No tienes un casillero asignado.</p>
                <Button onClick={() => onNavigate("request")} style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: "700", background: colors.primary, color: "white", borderRadius: "12px", height: "48px", width: "100%", border: "none" }}>
                  Solicitar Ahora
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- RECORDATORIO DINÁMICO (WARNING STYLE) --- */}
        {recordatorio && (
          <div 
            onClick={() => setShowNotis(true)}
            style={{ 
              background: `${colors.warning}10`, border: `1px solid ${colors.warning}30`, borderRadius: "20px", padding: "16px",
              display: "flex", alignItems: "start", gap: 14, cursor: "pointer", animation: "slideIn 0.4s ease-out"
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: `${colors.warning}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bell size={20} color={colors.warning} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "14px", color: colors.text, margin: 0 }}>Atención</h3>
              <p style={{ fontSize: "12px", color: colors.textSecondary, marginTop: 4, lineHeight: "1.5", margin: 0 }}>{recordatorio.mensaje}</p>
            </div>
          </div>
        )}

        {/* --- ACTIVIDAD RECIENTE --- */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
            <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>Actividad Reciente</h3>
            <button onClick={() => onNavigate("history")} style={{ background: "none", border: "none", color: colors.secondary, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center" }}>
              Ver todo <ChevronRight size={16} />
            </button>
          </div>
          <Card style={{ borderRadius: "16px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <CardContent style={{ padding: "8px 16px" }}>
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={activity.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 0", borderBottom: index !== recentActivity.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${activity.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <activity.icon size={18} color={activity.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{activity.action}</p>
                      <p style={{ fontSize: 12, color: colors.textSecondary, margin: 0 }}>{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", padding: "20px 0", fontSize: 14, color: colors.textSecondary }}>Sin actividad reciente.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* --- PANEL DE NOTIFICACIONES (OVERLAY) --- */}
      {showNotis && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", animation: "fadeIn 0.2s ease" }}>
          <div style={{ 
            width: "100%", height: "80%", background: "white", borderTopLeftRadius: "28px", borderTopRightRadius: "28px", 
            display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease-out" 
          }}>
            <div style={{ padding: "20px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 18, margin: 0 }}>Bandeja de Entrada</h2>
              <button onClick={() => setShowNotis(false)} style={{ background: "#f0f0f0", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px" }}>
              {isLoadingNotis ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 className="animate-spin" color={colors.primary} /></div>
              ) : notifications.length > 0 ? (
                notifications.map(n => (
                  <div key={n.id} style={{ padding: "16px 0", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "10px", background: n.tipo === 'warning' ? colors.warning + '20' : colors.success + '20', display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <AlertTriangle size={18} color={n.tipo === 'warning' ? colors.warning : colors.success} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, margin: 0, color: colors.text, fontWeight: n.leida ? 400 : 600 }}>{n.mensaje}</p>
                      <span style={{ fontSize: 11, color: colors.textSecondary, textTransform: "uppercase", fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>{n.tipo}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", color: colors.textSecondary, marginTop: 40 }}>No hay notificaciones.</p>
              )}
            </div>
            <div style={{ padding: 20 }}>

            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}