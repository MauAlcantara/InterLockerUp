import { useState } from "react"
import { Lock, Unlock, CheckCircle2, Clock, Calendar, Filter } from "lucide-react"

const mockHistory = [
  { id: "1", type: "access", action: "Casillero abierto", locker: "A-12", timestamp: "10:30 AM", date: "Hoy" },
  { id: "2", type: "checkin", action: "Check-in realizado", locker: "A-12", timestamp: "9:00 AM", date: "Hoy" },
  { id: "3", type: "access", action: "Casillero cerrado", locker: "A-12", timestamp: "8:45 AM", date: "Hoy" },
  { id: "4", type: "access", action: "Casillero abierto", locker: "A-12", timestamp: "8:30 AM", date: "Hoy" },
  { id: "5", type: "checkin", action: "Check-in realizado", locker: "A-12", timestamp: "4:00 PM", date: "Ayer" },
  { id: "6", type: "access", action: "Casillero abierto", locker: "A-12", timestamp: "2:30 PM", date: "Ayer" },
  { id: "7", type: "request", action: "Casillero asignado", locker: "A-12", timestamp: "8:00 AM", date: "Ayer" },
  { id: "8", type: "checkin", action: "Check-in realizado", locker: "B-05", timestamp: "3:00 PM", date: "15 Ene" },
  { id: "9", type: "access", action: "Casillero devuelto", locker: "B-05", timestamp: "5:00 PM", date: "15 Ene" },
]

export default function HistoryScreen() {
  const [filter, setFilter] = useState("all")

  const getIcon = (type) => { switch (type) { case "access": return Unlock; case "checkin": return CheckCircle2; case "request": return Lock; default: return Clock } }
  const getIconColor = (type) => { switch (type) { case "access": return "text-[#0b4dbb] bg-[#0b4dbb]/10"; case "checkin": return "text-[#2fa4a9] bg-[#2fa4a9]/10"; case "request": return "text-[#f2b705] bg-[#f2b705]/10"; default: return "text-[#64748b] bg-[#f1f5f9]" } }

  const filteredHistory = filter === "all" ? mockHistory : mockHistory.filter((item) => item.type === filter)
  const groupedHistory = filteredHistory.reduce((acc, item) => { if (!acc[item.date]) acc[item.date] = []; acc[item.date].push(item); return acc }, {})

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <header className="bg-[#0b4dbb] text-white px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>Historial de Uso</h1>
        <div className="flex gap-2">
          {[{ key: "all", label: "Todos" }, { key: "access", label: "Accesos" }, { key: "checkin", label: "Check-ins" }].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${filter === f.key ? "bg-white text-[#0b4dbb]" : "bg-white/10 text-white hover:bg-white/20"}`} style={{ fontFamily: "'Montserrat', sans-serif" }}>{f.label}</button>
          ))}
        </div>
      </header>

      <main className="px-4 -mt-4">
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1"><p className="text-2xl font-bold text-[#0b4dbb]" style={{ fontFamily: "'Montserrat', sans-serif" }}>23</p><p className="text-xs text-[#64748b]">Accesos</p></div>
            <div className="w-px h-10 bg-[#e2e8f0]" />
            <div className="text-center flex-1"><p className="text-2xl font-bold text-[#2fa4a9]" style={{ fontFamily: "'Montserrat', sans-serif" }}>15</p><p className="text-xs text-[#64748b]">Check-ins</p></div>
            <div className="w-px h-10 bg-[#e2e8f0]" />
            <div className="text-center flex-1"><p className="text-2xl font-bold text-[#1e293b]" style={{ fontFamily: "'Montserrat', sans-serif" }}>5</p><p className="text-xs text-[#64748b]">Dias activo</p></div>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(groupedHistory).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-[#64748b]" /><h3 className="text-sm font-medium text-[#64748b]">{date}</h3></div>
              <div className="bg-white rounded-xl shadow-md divide-y divide-[#e2e8f0]">
                {items.map((item) => {
                  const Icon = getIcon(item.type)
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconColor(item.type)}`}><Icon className="w-5 h-5" /></div>
                      <div className="flex-1"><p className="text-sm font-medium text-[#1e293b]">{item.action}</p><p className="text-xs text-[#64748b]">Locker {item.locker}</p></div>
                      <div className="text-right"><p className="text-sm text-[#64748b]">{item.timestamp}</p></div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {filteredHistory.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#f1f5f9] rounded-full flex items-center justify-center mx-auto mb-4"><Filter className="w-8 h-8 text-[#64748b]" /></div>
            <p className="text-[#64748b]">No hay registros para este filtro</p>
          </div>
        )}
      </main>
    </div>
  )
}