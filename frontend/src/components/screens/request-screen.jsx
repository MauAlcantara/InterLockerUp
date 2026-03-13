import React, { useState, useEffect } from "react";
import { MapPin, History, LifeBuoy, Home, Loader2 } from "lucide-react";
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
            const response = await getUserRequests();
            
            // Si el usuario ya tiene una solicitud activa o pendiente
            if (response.solicitudes && response.solicitudes.length > 0) {
                const ultima = response.solicitudes[0];
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
            } else {
                // Si no hay solicitudes, cargamos el mapa de lockers disponibles
                const data = await getAvailableLockers(); 
                setLockers(data.lockers || []);
                setShowConfirmation(false);
                setSelectedLocker(null);
            }
        } catch (error) {
            console.error("Error en initData:", error);
            // Fallback: intentar cargar lockers si falla la carga de solicitudes
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

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
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
            <header className="text-white px-6 pt-12 pb-10 " style={{ backgroundColor: colors.primary }}>
                <h1 className="font-montserrat text-[28px] font-bold leading-tight">Solicitar Casillero</h1>
                <p className="font-roboto text-[12px] text-white/90 mt-1">Selecciona la ubicación de tu preferencia</p>
            </header>

            <main className="px-4 -mt-6 space-y-4 flex-1 pb-24">
                <SharedLocker 
                    isShared={isShared} 
                    setIsShared={setIsShared} 
                    partners={partners} 
                    setPartners={setPartners} 
                    searchValue={searchValue} 
                    setSearchValue={setSearchValue} 
                />

                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="font-montserrat text-[18px] font-medium text-slate-700">Mapa de Lockers</h3>
                        <span className="font-roboto text-[12px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-medium">
                            {lockers.length} DISPONIBLES
                        </span>
                    </div>
                    <LockerGrid 
                        lockers={lockers} 
                        selectedLocker={selectedLocker} 
                        setSelectedLocker={setSelectedLocker} 
                    />
                </div>

  <Button
    onClick={handleRequest}
    disabled={!selectedLocker || isSubmitting}
    className={cn(
        "w-full h-16 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3",
        (!selectedLocker || isSubmitting) ? "bg-slate-200 text-slate-400" : "text-white"
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