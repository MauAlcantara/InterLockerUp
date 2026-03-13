import { useState, useEffect } from "react"
import BottomNav from "./components/BottomNav"
import LoginScreen from "./components/screens/LoginScreen"
import RegisterScreen from "./components/screens/RegisterScreen"
import HomeScreen from "./components/screens/HomeScreen"
import RequestScreen from "./components/screens/RequestScreen"
import AccessScreen from "./components/screens/AccessScreen"
import HistoryScreen from "./components/screens/HistoryScreen"
import SupportScreen from "./components/screens/SupportScreen"

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authScreen, setAuthScreen] = useState("login")
  const [activeTab, setActiveTab] = useState("home")

  // El guardia de seguridad para la sesión
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      setIsLoggedIn(true)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("userName")
    setIsLoggedIn(false)
    setActiveTab("home")
    setAuthScreen("login")
  }

  // Envuelve el renderizado para no repetir código
  const Content = () => {
    if (!isLoggedIn) {
      if (authScreen === "register") {
        return <RegisterScreen onRegister={() => setIsLoggedIn(true)} onBackToLogin={() => setAuthScreen("login")} />
      }
      return <LoginScreen onLogin={() => setIsLoggedIn(true)} onGoToRegister={() => setAuthScreen("register")} />
    }

    switch (activeTab) {
      case "home": return <HomeScreen onNavigate={setActiveTab} onLogout={handleLogout} />
      case "request": return <RequestScreen />
      case "access": return <AccessScreen />
      case "history": return <HistoryScreen />
      case "support": return <SupportScreen />
      default: return <HomeScreen onNavigate={setActiveTab} onLogout={handleLogout} />
    }
  }

  return (
    // 1. Fondo para PC (Gris oscuro) que centra el contenido
    <div className="min-h-screen bg-[#cbd5e1] md:flex md:items-center md:justify-center">
      
      {/* 2. El "Celular Virtual" (Solo toma forma en PC, en móvil es 100%) */}
      <div className="w-full min-h-screen bg-[#f8fafc] md:min-h-[850px] md:max-h-[90vh] md:max-w-[420px] md:rounded-[2.5rem] md:shadow-2xl md:border-[8px] md:border-gray-900 relative overflow-hidden flex flex-col">
        
        {/* 3. Área scrolleable donde viven tus pantallas */}
        <div className="flex-1 overflow-y-auto">
          <Content />
        </div>

        {/* 4. Navegación Inferior (Solo si está logueado) */}
        {isLoggedIn && (
          <div className="relative">
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        )}
      </div>
    </div>
  )
}

export default App