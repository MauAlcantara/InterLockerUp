import { Home, MapPin, QrCode, History, HelpCircle } from "lucide-react"

const navItems = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "request", label: "Solicitar", icon: MapPin },
  { id: "access", label: "Acceso", icon: QrCode, isCenter: true },
  { id: "history", label: "Historial", icon: History },
  { id: "support", label: "Soporte", icon: HelpCircle },
]

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="absolute bottom-0 left-0 w-full bg-white border-t border-[#e2e8f0] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`relative -top-4 flex flex-col items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all duration-200 bg-[#0b4dbb] text-white ${
                  isActive ? "ring-4 ring-[#0b4dbb]/30 scale-105" : ""
                }`}
                aria-label={item.label}
              >
                <Icon className="w-7 h-7" />
                <span className="text-[10px] font-semibold mt-0.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {item.label}
                </span>
              </button>
            )
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200 ${
                isActive ? "text-[#0b4dbb]" : "text-[#64748b] hover:text-[#1f78ff]"
              }`}
              aria-label={item.label}
            >
              <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""}`} />
              <span
                className={`text-[10px] mt-1 ${isActive ? "font-semibold" : "font-medium"}`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}