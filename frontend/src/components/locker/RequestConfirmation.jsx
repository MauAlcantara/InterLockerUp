import React, { useState } from "react";
import { Check, Lock, User, Clock, XCircle, Home, MapPin, History, LifeBuoy, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert"; 
import Button from "../ui/button";
import colors from "../theme/colors";
import { cn } from "../../lib/utils";

export default function RequestConfirmation({ 
    requestId, 
    selectedLocker, 
    isShared, 
    partners = [], 
    status, 
    onCancel, 
    onRetry 
}) {
    // Estado para controlar la visibilidad de la alerta de confirmación
    const [showCancelAlert, setShowCancelAlert] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const statusConfig = {
        pending: {
            icon: <Clock className="w-12 h-12 animate-pulse" />,
            title: "¡Solicitud Enviada!",
            subtitle: "En Revisión",
            message: "Tu solicitud está siendo procesada por la administración.",
            mainColor: colors.warning,
            lightColor: `${colors.warning}15`,
            borderColor: `${colors.warning}40`
        },
        approved: {
            icon: <Check className="w-12 h-12" strokeWidth={3} />,
            title: "¡Solicitud Aprobada!",
            subtitle: "Todo listo",
            message: "¡Felicidades! Tu casillero ya está asignado y listo para usarse.",
            mainColor: colors.success,
            lightColor: `${colors.success}15`,
            borderColor: `${colors.success}40`
        },
        rejected: {
            icon: <XCircle className="w-12 h-12" />,
            title: "Solicitud Rechazada",
            subtitle: "No disponible",
            message: "Lo sentimos, no fue posible asignar este casillero por el momento.",
            mainColor: colors.error,
            lightColor: `${colors.error}15`,
            borderColor: `${colors.error}40`
        }
    };

    const config = statusConfig[status] || statusConfig.pending;

    const handleConfirmCancel = async () => {
        setIsCancelling(true);
        try {
            await onCancel(requestId);
            // La redirección o cambio de estado lo maneja el padre (RequestScreen)
        } catch (error) {
            setIsCancelling(false);
            setShowCancelAlert(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-roboto">
            <header className="text-white px-6 pt-12 pb-14  shadow-lg transition-colors duration-500"
                    style={{ backgroundColor: config.mainColor }}>
                <h1 className="text-2xl font-montserrat font-bold text-center">{config.title}</h1>
            </header>

            <main className="px-6 -mt-8 flex-1 pb-10">
                {/* ALERTA DE CONFIRMACIÓN PERSONALIZADA */}
                {showCancelAlert && (
                    <div className="mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <Alert variant="error">
                            <div className="flex gap-3">
                                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                                <div className="flex-1">
                                    <AlertTitle>¿Confirmar cancelación?</AlertTitle>
                                    <AlertDescription>
                                        Esta acción liberará el locker y no se puede deshacer.
                                    </AlertDescription>
                                    <div className="flex gap-3 mt-4">
                                        <button 
                                            onClick={handleConfirmCancel}
                                            disabled={isCancelling}
                                            className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase"
                                        >
                                            {isCancelling ? "Cancelando..." : "Sí, cancelar"}
                                        </button>
                                        <button 
                                            onClick={() => setShowCancelAlert(false)}
                                            className="bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs uppercase"
                                        >
                                            No, mantener
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Alert>
                    </div>
                )}

                <Card className="shadow-2xl border-0 rounded-[32px] overflow-hidden bg-white">
                    <CardContent className="p-8 text-center">
                        <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 border-4 transition-all"
                             style={{ backgroundColor: config.lightColor, borderColor: config.borderColor, color: config.mainColor }}>
                            {config.icon}
                        </div>

                        <h2 className="text-2xl font-montserrat font-bold text-slate-800 mb-2">{config.subtitle}</h2>
                        <p className="text-slate-400 text-sm mb-8 px-4 leading-relaxed">{config.message}</p>

                        <div className="bg-slate-50 rounded-3xl p-6 text-left mb-8 border border-slate-100">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner bg-white">
                                    <Lock className="w-7 h-7" style={{ color: config.mainColor }} />
                                </div>
                                <div>
                                    <h3 className="font-montserrat font-bold text-lg text-slate-800 leading-tight">
                                        Locker {selectedLocker?.identificador || "N/A"}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        {selectedLocker?.edificio || "Edificio"}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-200">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Ubicación:</span>
                                    <span className="font-bold text-slate-700">{selectedLocker?.floor}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Modalidad:</span>
                                    <span className="font-bold px-2 py-0.5 rounded-md text-[10px] uppercase" 
                                          style={{ backgroundColor: config.lightColor, color: config.mainColor }}>
                                        {isShared ? "Compartido" : "Individual"}
                                    </span>
                                </div>

                                {/* LISTA DE COMPAÑEROS */}
{isShared && partners && partners.length > 0 && (
    <div className="mt-4 pt-4 border-t border-dashed border-slate-300">
        <p className="text-[10px] text-slate-400 mb-3 uppercase tracking-widest font-bold">
            Compañeros de acceso:
        </p>
        <div className="space-y-2">
            {partners.map((p, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                        <p className="font-bold text-slate-700 text-xs leading-none">
                            {/* Soporta 'name' (front local) y 'nombre_completo' (backend) */}
                            {p.name || p.nombre_completo}
                        </p>
                        <p className="text-[9px] text-slate-400">{p.matricula}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
)}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {status === 'pending' && !showCancelAlert && (
                                <Button 
                                    onClick={() => setShowCancelAlert(true)}
                                    className="w-full h-16 rounded-2xl bg-slate-50 text-slate-500 font-montserrat font-bold border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
                                >
                                    Cancelar Solicitud
                                </Button>
                            )}

                            {status === 'approved' && (
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700 font-bold text-sm">
                                    Puedes generar tu QR para abrir el casillero en cualquier momento.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>
           
        </div>
    );
}