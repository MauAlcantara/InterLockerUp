import { useState, useEffect } from "react"
import { Bell, Lock, Clock, AlertTriangle, CheckCircle2, LogOut, Loader2, Info } from "lucide-react"
import { API_URL } from "../../config"

export default function HomeScreen({ onNavigate, onLogout }) {
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [locker, setLocker] = useState(null);
  const [recordatorio, setRecordatorio] = useState(null); 
  const [actividades, setActividades] = useState([]);     
  const [isLoading, setIsLoading] = useState(true);

  // 1. Cargar datos del Backend
  useEffect(() => {
    const nombre = localStorage.getItem('userName') || "Alumno";
    setNombreUsuario(nombre);

    const fetchHomeData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/home`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setLocker(data.locker);
          setRecordatorio(data.recordatorio);
          setActividades(data.actividades);
        } else if (res.status === 401) {
          onLogout();
        }
      } catch (error) {
        console.error("Error cargando el inicio:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeData();
  }, [onLogout]);

  // 2. Efecto de Cronómetro
  useEffect(() => {
    if (!locker || locker.timeLeft <= 0) return;

    const interval = setInterval(() => {
      setLocker((prevLocker) => {
        if (!prevLocker || prevLocker.timeLeft <= 0) {
          clearInterval(interval);
          return prevLocker;
        }
        return {
          ...prevLocker,
          timeLeft: prevLocker.timeLeft - 1
        };
      });
    }, 60000); 

    return () => clearInterval(interval);
  }, [locker]);

  const getActivityStyle = (type) => {
    switch(type) {
      case 'checkin': return { Icon: CheckCircle2, color: "text-[#2fa4a9]" };
      case 'open': return { Icon: Lock, color: "text-[#0b4dbb]" };
      case 'warning': return { Icon: AlertTriangle, color: "text-[#c94a4a]" };
      default: return { Icon: Info, color: "text-[#64748b]" };
    }
  }

  // Función para formatear el tiempo bonito (Días, Horas, Minutos)
  const formatTimeLeft = (totalMinutes) => {
    if (totalMinutes < 60) return `${totalMinutes} min`;
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);

    if (days > 0) {
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days} días ${remainingHours}h` : `${days} días`;
    }
    
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center pb-24">
        <Loader2 className="w-10 h-10 text-[#0b4dbb] animate-spin mb-4" />
        <p className="text-[#64748b] font-medium" style={{ fontFamily: "'Montserrat', sans-serif" }}>Cargando tu casillero...</p>
      </div>
    );
  }

  // Cálculos dinámicos de colores
  const timePercentage = locker ? Math.min(100, Math.max(0, (locker.timeLeft / locker.totalTime) * 100)) : 0;
  const isLowTime = timePercentage <= 25;
  const isMediumTime = timePercentage > 25 && timePercentage <= 50;
  const getTimeColor = () => { if (isLowTime) return "bg-[#c94a4a]"; if (isMediumTime) return "bg-[#f2b705]"; return "bg-[#2fa4a9]" }
  const getTimeTextColor = () => { if (isLowTime) return "text-[#c94a4a]"; if (isMediumTime) return "text-[#f2b705]"; return "text-[#2fa4a9]" }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      {/* Header */}
      <header className="bg-[#0b4dbb] text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Bienvenido,</p>
            <h1 className="text-xl font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>{nombreUsuario}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" aria-label="Notificaciones">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#c94a4a] rounded-full" />
            </button>
            <button type="button" onClick={onLogout} className="p-2 rounded-full bg-white/10 hover:bg-[#c94a4a]/80 transition-colors" aria-label="Cerrar sesion">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 -mt-4 space-y-4 relative z-10">
        
        {/* Active Locker Card Dinámica */}
        {locker ? (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-[#0b4dbb] to-[#1f78ff] px-4 py-3">
              <div className="flex items-center gap-2 text-white">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-semibold" style={{ fontFamily: "'Montserrat', sans-serif" }}>Casillero Activo</span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-3xl font-bold text-[#1e293b]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Locker {locker.number}</h2>
                  <p className="text-sm text-[#64748b] mt-1">{locker.building}</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-[#0b4dbb]/10 flex items-center justify-center border-2 border-[#0b4dbb]/20">
                  <Lock className="w-8 h-8 text-[#0b4dbb]" />
                </div>
              </div>
              
              {/* Barra de Tiempo Animada */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${getTimeTextColor()}`} />
                    <span className={`text-sm font-semibold uppercase tracking-wider ${getTimeTextColor()}`}>Tiempo restante</span>
                  </div>
                  <span className={`text-lg font-bold ${getTimeTextColor()}`} style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {formatTimeLeft(locker.timeLeft)}
                  </span>
                </div>
                <div className="h-3.5 bg-[#f1f5f9] rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-in-out ${getTimeColor()}`} 
                    style={{ width: `${timePercentage}%` }} 
                  />
                </div>
              </div>
              
              {isLowTime && (
                <div className="mt-5 flex items-center gap-3 p-3 bg-[#c94a4a]/10 rounded-xl border border-[#c94a4a]/20 animate-in fade-in">
                  <AlertTriangle className="w-6 h-6 text-[#c94a4a] flex-shrink-0" />
                  <p className="text-xs text-[#c94a4a] font-semibold leading-snug">Tu tiempo está por terminar. El casillero podría liberarse pronto.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-dashed border-gray-300">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Lock className="w-8 h-8 text-gray-400" />
             </div>
             <h3 className="text-lg text-[#1e293b] font-bold">No tienes casilleros</h3>
             <p className="text-[#64748b] text-sm mt-2 mb-6">Solicita un casillero para comenzar a guardar tus cosas.</p>
             <button onClick={() => onNavigate("request")} className="px-6 py-3 bg-[#0b4dbb] text-white rounded-xl font-bold shadow-md shadow-[#0b4dbb]/20">
               Solicitar ahora
             </button>
          </div>
        )}

        {/* Recordatorio Dinámico */}
        {recordatorio && (
          <div className="bg-[#f2b705]/5 border border-[#f2b705]/30 rounded-2xl shadow-sm p-4 animate-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f2b705]/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-[#f2b705]" />
              </div>
              <div className="flex-1 mt-0.5">
                <h3 className="font-bold text-[#1e293b] text-sm">{recordatorio.titulo}</h3>
                <p className="text-xs text-[#64748b] mt-1 leading-relaxed">{recordatorio.mensaje}</p>
              </div>
            </div>
          </div>
        )}

        {/* Acciones Rápidas */}
        {locker && (
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => onNavigate("access")} className="py-5 flex flex-col items-center gap-3 rounded-2xl border-2 border-transparent bg-white shadow-sm hover:border-[#0b4dbb] hover:shadow-md transition-all active:scale-[0.98]">
              <div className="w-12 h-12 rounded-full bg-[#0b4dbb]/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-[#0b4dbb]" />
              </div>
              <span className="text-sm font-bold text-[#1e293b]">Generar QR</span>
            </button>
            <button onClick={() => onNavigate("support")} className="py-5 flex flex-col items-center gap-3 rounded-2xl border-2 border-transparent bg-white shadow-sm hover:border-[#c94a4a] hover:shadow-md transition-all active:scale-[0.98]">
              <div className="w-12 h-12 rounded-full bg-[#c94a4a]/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#c94a4a]" />
              </div>
              <span className="text-sm font-bold text-[#1e293b]">Reportar</span>
            </button>
          </div>
        )}

        {/* Historial Reciente */}
        {actividades.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#1e293b]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Actividad Reciente</h3>
              <button onClick={() => onNavigate("history")} className="text-xs font-bold text-[#0b4dbb] hover:underline">Ver todo</button>
            </div>
            <div className="space-y-4">
              {actividades.map((act) => {
                const style = getActivityStyle(act.type);
                const IconComponent = style.Icon;
                return (
                  <div key={act.id} className="flex items-center gap-4 group">
                    <div className={`w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center ${style.color} group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#1e293b]">{act.action}</p>
                      <p className="text-[11px] text-[#64748b] mt-0.5">{act.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}