import Button from "./ui/button"
import { Home, PlusSquare, KeyRound, History, LifeBuoy } from "lucide-react"

export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: "home", icon: Home },
    { id: "request", icon: PlusSquare },
    { id: "access", icon: KeyRound },
    { id: "history", icon: History },
    { id: "support", icon: LifeBuoy },
  ]

  return (
    <nav
      style={{
        position: "fixed",
        bottom: "16px", // La elevamos un poco del borde para que "flote"
        left: "20px",
        right: "20px",
        background: "#0b4dbb", // Azul Primario
        height: "64px", // Altura fija y delgada
        borderRadius: "20px", // Bordes muy redondeados para estilo cápsula
        display: "flex",
        justifyContent: "space-evenly",
        alignItems: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        zIndex: 1000,
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <Button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: isActive ? "#1f78ff" : "transparent",
              color: "#ffffff",
              borderRadius: "14px",
              padding: "0",
              width: "44px", // Ancho reducido
              height: "44px", // Alto reducido
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              opacity: isActive ? 1 : 0.6,
              cursor: "pointer",
              boxShadow: isActive ? "0 4px 10px rgba(0,0,0,0.15)" : "none"
            }}
          >
            <Icon 
              size={22} // Tamaño equilibrado (ni muy grande ni muy chico)
              strokeWidth={isActive ? 2.5 : 2} 
              style={{
                transition: "transform 0.2s ease",
                transform: isActive ? "scale(1.1)" : "scale(1)"
              }}
            />
          </Button>
        )
      })}
    </nav>
  )
}