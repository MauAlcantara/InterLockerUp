import React, { useState, useEffect } from "react"; 
import axios from 'axios';
import { User as UserIcon, Search, X, Users as UsersIcon } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import colors from "../theme/colors";

// Definimos el máximo de compañeros permitidos por casillero
const MAX_PARTNERS = 2; 

export default function SharedLocker({ isShared, setIsShared, partners, setPartners, searchValue, setSearchValue }) {
    const [suggestions, setSuggestions] = useState([]);
    const api = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const fetchSuggestions = async () => {
            const query = searchValue.trim();
            if (query.length < 3) {
                setSuggestions([]);
                return;
            }

            try {
                const token = localStorage.getItem('token');
                /**
                 * Realiza la petición al endpoint de búsqueda.
                 * Se recomienda usar params en axios para una sintaxis más limpia.
                 */
                const res = await axios.get(`${api}/api/users/search`, {
                    params: { q: query },
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                // Filtramos las sugerencias para no mostrar a los que ya fueron seleccionados
                const filtered = res.data.filter(
                    s => !partners.some(p => p.id === s.id)
                );
                
                setSuggestions(filtered);
            } catch (err) {
                console.error("Error en el autocompletado:", err);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timeoutId);
    }, [searchValue, partners, api]); // Se añade partners a dependencias para refrescar el filtro

    /**
     * Maneja la selección de un compañero de la lista de sugerencias.
     * Verifica que no se exceda el límite establecido.
     */
    const selectPartner = (partner) => {
        if (partners.length >= MAX_PARTNERS) {
            // Aquí podrías usar un toast.error si lo tienes instalado
            alert(`Máximo ${MAX_PARTNERS} compañeros permitidos`);
            return;
        }

        if (!partners.find(p => p.id === partner.id)) {
            setPartners([...partners, partner]);
        }
        setSearchValue("");
        setSuggestions([]);
    };

    return (
        <Card className="shadow-lg border-0 rounded-3xl bg-white overflow-hidden">
            <CardContent className="p-5 space-y-4">
                
                {/* Header con Switch para activar modo compartido */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                            style={{ backgroundColor: isShared ? `${colors.primary}15` : '#f1f5f9' }}
                        >
                            <UsersIcon size={20} style={{ color: isShared ? colors.primary : '#94a3b8' }} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">Casillero Compartido</span>
                            <span className="text-[10px] text-slate-400 italic font-medium">Busca por nombre o matrícula</span>
                        </div>
                    </div>
                    <Switch 
                        checked={isShared} 
                        onCheckedChange={(val) => { 
                            setIsShared(val); 
                            if(!val) setPartners([]); // Limpia la lista si se desactiva
                        }} 
                    />
                </div>

                {isShared && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                        {/* Input de búsqueda con ícono de lupa */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input
                                placeholder={partners.length >= MAX_PARTNERS ? "Límite alcanzado" : "Escribe para buscar..."}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                disabled={partners.length >= MAX_PARTNERS}
                                className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl focus:bg-white transition-all outline-none"
                            />
                        </div>

                        {/* Listado de sugerencias encontradas */}
                        {suggestions.length > 0 && (
                            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden shadow-inner">
                                {suggestions.map(s => (
                                    <button 
                                        key={s.id}
                                        type="button"
                                        onClick={() => selectPartner(s)}
                                        className="w-full text-left px-4 py-3 hover:bg-white flex justify-between items-center border-b border-slate-100 last:border-0 transition-colors group"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700 group-hover:text-[#0b4dbb]">{s.name}</span>
                                            <span className="text-[9px] text-slate-400 uppercase tracking-tighter">{s.matricula}</span>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                                            <UserIcon size={12} style={{ color: colors.primary }} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Chips de compañeros seleccionados */}
                        <div className="flex flex-wrap gap-2 min-h-[20px] pt-1">
                            {partners.map((p) => (
                                <div 
                                    key={p.id} 
                                    className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 animate-in zoom-in-95 duration-200"
                                >
                                    <UserIcon size={10} style={{ color: colors.primary }} />
                                    <span className="text-[10px] font-bold text-slate-600">{p.name}</span>
                                    <X 
                                        size={14} 
                                        className="text-slate-400 cursor-pointer hover:text-red-500 transition-colors" 
                                        onClick={() => setPartners(partners.filter(item => item.id !== p.id))} 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}