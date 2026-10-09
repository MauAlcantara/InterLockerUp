import React, { useState, useEffect } from "react";
import { MapPin, History, LifeBuoy, Home, Loader2, Lock, LogIn } from "lucide-react";
import Button from "../ui/button";
import { cn } from "../../lib/utils";
import colors from "../theme/colors";

// Servicios
import { 
    getAvailableLockers, 
    createLockerRequest, 
    getUserRequests,
    cancelLockerRequest 
} from "../../services/lockerService";

// Componentes
import SharedLocker from "../locker/ShareLocker";
import LockerGrid from "../locker/LockerGrid";
import RequestConfirmation from "../locker/RequestConfirmation";

export function RequestScreen() {
    const [lockers, setLockers] = useState([]);
    const [selectedLocker, setSelectedLocker] = useState(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [requestStatus, setRequestStatus] = useState("pending");
    const [requestId, setRequestId] = useState(null); 
    const [isShared, setIsShared] = useState(false);
    const [partners, setPartners] = useState([]);
    const [searchValue, setSearchValue] = useState("");
    const [loading, setLoading] = useState(true); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Función unificada para sincronizar datos con el servidor
    const initData = async () => {
        try {
            // 1. Verificamos en secreto si el alumno AÚN TIENE un casillero activo
            const token = localStorage.getItem("token");
            const activeLockerRes = await fetch(`${import.meta.env.VITE_API_URL}/api/perfil/my-locker`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const activeLocker = await activeLockerRes.json();

            // 2. Traemos el historial de solicitudes
            const response = await getUserRequests();
            
            // Si el usuario tiene solicitudes en su historial
            if (response.solicitudes && response.solicitudes.length > 0) {
                const ultima = response.solicitudes[0];
                
                if (ultima.status === 'pending' || (ultima.status === 'approved' && activeLocker !== null)) {
                    setRequestId(ultima.id);
                    setSelectedLocker({
                        id: ultima.locker_id,
                        identificador: ultima.locker_identificador,
                        edificio: ultima.building_name,
                        floor: ultima.locker_floor
                    });
                    setIsShared(ultima.shared);
                    setPartners(ultima.partners_details || []); 
                    setRequestStatus(ultima.status);
                    setShowConfirmation(true);
                    return; // Si entra aquí, detenemos la función para que no cargue el mapa
                }
            }
            
            // 3. Si no tiene solicitudes pendientes, o si su casillero aprobado ya fue liberado,
            // cargamos el mapa para que pueda pedir uno nuevo libremente.
            const data = await getAvailableLockers(); 
            setLockers(data.lockers || []);
            setShowConfirmation(false);
            setSelectedLocker(null);
            
        } catch (error) {
            console.error("Error en initData:", error);
            // Fallback: intentar cargar lockers si falla la carga
            const data = await getAvailableLockers(); 
            setLockers(data.lockers || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initData();
    }, []);

    const handleRequest = async () => {
        if (!selectedLocker) return;
        setIsSubmitting(true); 
        try {
            // Extraemos solo los IDs de los partners para enviarlos al backend
            const partnerIds = isShared ? partners.map(p => p.id) : [];
            
            await createLockerRequest({
                lockerId: selectedLocker.id,
                isShared,
                partners: partnerIds 
            });

            // Refrescamos todo el estado desde el servidor para obtener la data real
            await initData();
        } catch (error) {
            alert(error.response?.data?.mensaje || "Error al procesar solicitud.");
        } finally {
            setIsSubmitting(false); 
        }
    };

    const handleCancelRequest = async (id) => {
        // La confirmación visual ya la hace el componente hijo, 
        // pero aquí ejecutamos la lógica del servicio.
        try {
            await cancelLockerRequest(id);
            
            // Limpiamos estados locales antes de recargar
            setShowConfirmation(false);
            setSelectedLocker(null);
            setPartners([]);
            setIsShared(false);
            setRequestId(null);
            
            // Recargamos lockers disponibles
            await initData();
        } catch (error) {
            alert(error.response?.data?.mensaje || "No se pudo cancelar.");
            await initData();
        }
    };

    // SIN SESIÓN: pantalla informativa (mismo token y misma redirección que usa el Home)
    if (!localStorage.getItem("token")) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col font-roboto text-[14px]">
                <header className="text-white px-4 pt-14 pb-9" style={{ backgroundColor: colors.primary }}>
                    <h1 className="font-montserrat text-[22px] font-bold leading-tight">Solicitar Casillero</h1>
                    <p className="font-roboto text-[13px] text-white/85 mt-1">Necesitas una sesión activa para continuar</p>
                </header>

                <main className="px-4 -mt-5 space-y-5 flex-1 pb-24">
                    <div
                        className="bg-white rounded-2xl p-5"
                        style={{ boxShadow: "0 8px 16px rgba(0,0,0,0.06)" }}
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div
                                className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${colors.primary}15` }}
                            >
                                <Lock size={26} color={colors.primary} />
                            </div>
                            <div>
                                <h2 className="font-montserrat text-[18px] font-bold text-slate-700 leading-tight">
                                    Primero solicita tu locker
                                </h2>
                                <p className="font-roboto text-[13px] text-slate-500 mt-1">
                                    Para acceder a un casillero, debes iniciar sesión y solicitar uno.
                                </p>
                            </div>
                        </div>

                        <ol className="space-y-4 mb-6">
                            {[
                                { title: "Inicia sesión", text: "Entra con tu cuenta de alumno." },
                                { title: "Solicita tu locker", text: "Elige la ubicación que prefieras en el mapa y confirma." },
                                { title: "Accede", text: "Cuando tu solicitud sea aprobada, podrás usar tu casillero." }
                            ].map((step, i) => (
                                <li key={step.title} className="flex items-start gap-3">
                                    <span
                                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-montserrat text-[14px] font-bold"
                                        style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
                                    >
                                        {i + 1}
                                    </span>
                                    <div>
                                        <p className="text-[14px] font-semibold text-slate-700 m-0">{step.title}</p>
                                        <p className="text-[12px] text-slate-500 m-0 mt-0.5">{step.text}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>

                        <Button
                            onClick={() => { window.location.href = "/login"; }}
                            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-white"
                            style={{
                                fontFamily: "'Montserrat', sans-serif",
                                fontSize: "16px",
                                fontWeight: "700",
                                backgroundColor: colors.primary,
                                border: "none",
                                cursor: "pointer"
                            }}
                        >
                            <LogIn size={20} />
                            Iniciar sesión
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    if (loading) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center bg-slate-50"
                role="status"
                aria-live="polite"
            >
                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" 
                     style={{ borderTopColor: colors.primary }} />
                <p className="font-roboto text-[14px] text-slate-500">Cargando información...</p>
            </div>
        );
    }

    // PANTALLA DE CONFIRMACIÓN (SOLICITUD ACTIVA)
    if (showConfirmation && selectedLocker) {
        return (
            <RequestConfirmation 
                requestId={requestId}
                selectedLocker={selectedLocker}
                isShared={isShared}
                partners={partners} 
                status={requestStatus}
                onCancel={handleCancelRequest}
            />
        );
    }

    // PANTALLA DE SOLICITUD (MAPA)
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-roboto text-[14px]">
            <header className="text-white px-4 pt-14 pb-9" style={{ backgroundColor: colors.primary }}>
                <h1 className="font-montserrat text-[22px] font-bold leading-tight">Solicitar Casillero</h1>
                <p className="font-roboto text-[13px] text-white/85 mt-1">Selecciona la ubicación de tu preferencia</p>
            </header>

            <main className="px-4 -mt-5 space-y-5 flex-1 pb-24">
                <SharedLocker 
                    isShared={isShared} 
                    setIsShared={setIsShared} 
                    partners={partners} 
                    setPartners={setPartners} 
                    searchValue={searchValue} 
                    setSearchValue={setSearchValue} 
                />

                <div
                    className="bg-white rounded-2xl p-5"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="font-montserrat text-[16px] font-bold text-slate-700">Mapa de Lockers</h3>
                        <span
                            className="font-roboto text-[12px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-medium"
                            aria-live="polite"
                        >
                            {lockers.length} DISPONIBLES
                        </span>
                    </div>
                    <LockerGrid 
                        lockers={lockers} 
                        selectedLocker={selectedLocker} 
                        setSelectedLocker={setSelectedLocker} 
                    />
                </div>

                <div>
                    <Button
                        onClick={handleRequest}
                        disabled={!selectedLocker || isSubmitting}
                        aria-busy={isSubmitting}
                        className={cn(
                            "w-full h-12 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                            (!selectedLocker || isSubmitting) ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "text-white cursor-pointer"
                        )}
                        style={{
                            // Forzamos la tipografía aquí para evitar conflictos con Tailwind
                            fontFamily: "'Montserrat', sans-serif",
                            fontSize: "16px",
                            fontWeight: "700",
                            backgroundColor: selectedLocker && !isSubmitting ? colors.primary : undefined,
                            border: "none"
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span style={{ fontFamily: "'Montserrat', sans-serif" }}>Procesando...</span>
                            </>
                        ) : (
                            "Confirmar Solicitud"
                        )}
                    </Button>

                    {!selectedLocker && !isSubmitting && (
                        <p className="font-roboto text-[12px] text-slate-500 text-center mt-2 mb-0">
                            Selecciona un locker del mapa para continuar.
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}

function NavIcon({ icon, label, active = false }) {
    return (
        <div className={cn("flex flex-col items-center gap-1 cursor-pointer transition-all", active ? "scale-105" : "text-slate-400")}>
            <div className={cn("p-2 rounded-xl", active ? "bg-slate-50" : "bg-transparent")} style={active ? { color: colors.primary } : {}}>
                {icon}
            </div>
            <span className={cn("font-roboto text-[12px]", active ? "opacity-100 font-bold" : "opacity-60")} style={active ? { color: colors.primary } : {}}>
                {label}
            </span>
        </div>
    );
}
