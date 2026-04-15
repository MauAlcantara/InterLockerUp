import React, { useState } from "react";
import { Check, Lock, User, Clock, XCircle, AlertTriangle, Loader2, KeyRound } from "lucide-react";
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
    onCancel 
}) {
    const [showCancelAlert, setShowCancelAlert] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    // --- NUEVOS ESTADOS PARA EL FLUJO DE APERTURA ---
    const [pinStep, setPinStep] = useState(false); // Cambia entre botón y teclado de PIN
    const [pinValue, setPinValue] = useState("");
    const [isWorking, setIsWorking] = useState(false);

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

    // --- LÓGICA DE APERTURA (REPLICA EL CURL) ---

    // 1. Solicitar que el servidor envíe el correo (request-pin)
    const handleRequestPin = async () => {
        setIsWorking(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/access/request-pin`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            alert(data.mensaje || "PIN enviado a tu correo");
            setPinStep(true);
        } catch (error) {
            alert("Error al conectar con el servidor");
        } finally {
            setIsWorking(false);
        }
    };

    // 2. Enviar el PIN ingresado para abrir (remote-unlock)
    const handleRemoteUnlock = async () => {
        setIsWorking(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/access/remote-unlock`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ pin_ingresado: pinValue }) // Clave idéntica a la del backend
            });
            const data = await res.json();
            
            if (res.ok) {
                alert("✅ " + data.mensaje);
                setPinStep(false);
                setPinValue("");
            } else {
                alert("❌ " + data.mensaje);
            }
        } catch (error) {
            alert("Error al validar el PIN");
        } finally {
            setIsWorking(false);
        }
    };

    const handleConfirmCancel = async () => {
        setIsCancelling(true);
        try {
            await onCancel(requestId);
        } catch (error) {
            setIsCancelling(false);
            setShowCancelAlert(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-roboto">
            <header className="text-white px-6 pt-12 pb-14 shadow-lg transition-colors duration-500"
                    style={{ backgroundColor: config.mainColor }}>
                <h1 className="text-2xl font-montserrat font-bold text-center">{config.title}</h1>
            </header>

            <main className="px-6 -mt-8 flex-1 pb-10">
                {showCancelAlert && (
                    <div className="mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <Alert variant="error">
                            <div className="flex gap-3">
                                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                                <div className="flex-1">
                                    <AlertTitle>¿Confirmar cancelación?</AlertTitle>
                                    <AlertDescription>Esta acción liberará el locker y no se puede deshacer.</AlertDescription>
                                    <div className="flex gap-3 mt-4">
                                        <button onClick={handleConfirmCancel} disabled={isCancelling} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase">
                                            {isCancelling ? "Cancelando..." : "Sí, cancelar"}
                                        </button>
                                        <button onClick={() => setShowCancelAlert(false)} className="bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs uppercase">No, mantener</button>
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
                            </div>
                        </div>

                        {/* SECCIÓN INTERACTIVA DE APERTURA */}
                        <div className="space-y-3">
                            {status === 'pending' && !showCancelAlert && (
                                <Button 
                                    onClick={() => setShowCancelAlert(true)}
                                    className="w-full h-16 rounded-2xl bg-slate-50 text-slate-500 font-montserrat font-bold border border-slate-200"
                                >
                                    Cancelar Solicitud
                                </Button>
                            )}

                            {status === 'approved' && (
                                <div className="animate-in fade-in zoom-in duration-300 space-y-4">
                                    {!pinStep ? (
                                        <Button 
                                            onClick={handleRequestPin}
                                            disabled={isWorking}
                                            className="w-full h-16 rounded-2xl text-white font-montserrat font-bold shadow-lg flex items-center justify-center gap-2"
                                            style={{ backgroundColor: colors.success }}
                                        >
                                            {isWorking ? <Loader2 className="animate-spin" /> : <KeyRound size={20} />}
                                            Solicitar PIN de Apertura
                                        </Button>
                                    ) : (
                                        <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-emerald-200 space-y-4">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ingresa el PIN recibido:</p>
                                            <input 
                                                type="text" 
                                                maxLength="6"
                                                value={pinValue}
                                                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                                                className="w-full text-center text-3xl font-bold tracking-[8px] h-16 bg-white rounded-2xl border-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="000000"
                                            />
                                            <div className="flex gap-2">
                                                <Button onClick={() => setPinStep(false)} className="flex-1 h-12 rounded-xl bg-slate-200 text-slate-500 font-bold">Cancelar</Button>
                                                <Button 
                                                    onClick={handleRemoteUnlock} 
                                                    disabled={pinValue.length < 6 || isWorking}
                                                    className="flex-[2] h-12 rounded-xl text-white font-bold"
                                                    style={{ backgroundColor: colors.success }}
                                                >
                                                    {isWorking ? "Validando..." : "Confirmar Apertura"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-400">El PIN caduca en 5 minutos.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
