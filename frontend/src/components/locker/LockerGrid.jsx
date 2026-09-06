import { cn } from "../../lib/utils";
import colors from "../theme/colors";

export default function LockerGrid({ lockers = [], selectedLocker, setSelectedLocker }) {
    
    if (lockers.length === 0) {
        return (
            <div className="p-8 text-center text-slate-400 font-montserrat italic border-2 border-dashed border-slate-100 rounded-2xl">
                No hay casilleros registrados para tu carrera.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
                {lockers.map((locker) => {
                    const isSelected = selectedLocker?.id === locker.id;
                    const estado = locker.estado.toLowerCase();
                    const isAvailable = estado === "disponible";

                    // Definición de estilos por estado según tu guía
                    let stateStyles = "";
                    let customStyle = {};

                    if (isSelected) {
                        stateStyles = "text-white shadow-md scale-105 border-transparent";
                        customStyle = { backgroundColor: colors.success };
                    } else if (estado === "disponible") {
                        stateStyles = "bg-white border-slate-200 text-slate-600 hover:border-slate-400";
                    } else if (estado === "proceso") {
                        stateStyles = "text-white border-transparent cursor-not-allowed opacity-70";
                        customStyle = { backgroundColor: colors.warning };
                    } else { // 'ocupado' o 'bloqueado'
                        stateStyles = "text-white border-transparent cursor-not-allowed opacity-40";
                        customStyle = { backgroundColor: colors.error };
                    }

                    return (
                        <button
                            key={locker.id}
                            type="button"
                            onClick={() => isAvailable && setSelectedLocker(locker)}
                            disabled={!isAvailable}
                            className={cn(
                                "h-12 rounded-lg border-2 flex items-center justify-center font-montserrat font-bold text-sm transition-all duration-200",
                                stateStyles
                            )}
                            style={customStyle}
                        >
                            {locker.identificador}
                        </button>
                    );
                })}
            </div>

            {/* Leyenda de estados actualizada */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[9px] font-montserrat font-black text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm border-2 border-slate-200 bg-white" /> 
                    <span>Libre</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors.warning }} /> 
                    <span>En Proceso</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors.error }} /> 
                    <span>Ocupado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm ring-2 ring-offset-1" style={{ backgroundColor: colors.success, ringColor: colors.success }} /> 
                    <span style={{ color: colors.success }}>Tu Selección</span>
                </div>
            </div>
        </div>
    );
}