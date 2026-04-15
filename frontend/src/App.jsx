import { useState } from "react"
import BottomNav from "./components/bottom-nav"
import { Toaster } from "react-hot-toast"
import LoginScreen from "./components/screens/login-screen"
import RegisterScreen from "./components/screens/register-screen"
import HomeScreen from "./components/screens/home-screen"
import { RequestScreen } from "./components/screens/request-screen"
import AccessScreen from "./components/screens/access-screen"
import { HistoryScreen } from "./components/screens/history-screen"
import SupportScreen from "./components/screens/support-screen"
import { ProfileScreen } from "./components/screens/ProfileScreen"
import OtpScreen from "./components/screens/OtpScreen" // Importamos la nueva pantalla

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem("token");
  })
  const [authScreen, setAuthScreen] = useState("login") // login, register, otp
  const [activeTab, setActiveTab] = useState("home")
  const [tempStudentId, setTempStudentId] = useState("") // Para guardar la matrícula durante el OTP

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false)
    setActiveTab("home")
    setAuthScreen("login")
  }

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
    setAuthScreen("login") // Reset para futuros logouts
  }

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen onNavigate={setActiveTab} onLogout={handleLogout} />
      case "request":
        return <RequestScreen />
      case "access":
        return <AccessScreen />
      case "history":
        return <HistoryScreen />
      case "support":
        return <SupportScreen />
      case "profile":
        return <ProfileScreen onLogout={handleLogout} />
      default:
        return <HomeScreen onNavigate={setActiveTab} onLogout={handleLogout} />
    }
  }

  // --- FLUJO DE AUTENTICACIÓN ---
  if (!isLoggedIn) {
    return (
      <>
        <Toaster position="top-center" />
        {authScreen === "register" && (
          <RegisterScreen
            onRegister={handleLoginSuccess}
            onBackToLogin={() => setAuthScreen("login")}
          />
        )}

        {authScreen === "login" && (
          <LoginScreen
            onLogin={handleLoginSuccess}
            onGoToRegister={() => setAuthScreen("register")}
            onOtpRequired={(id) => {
              setTempStudentId(id)
              setAuthScreen("otp")
            }}
          />
        )}

        {authScreen === "otp" && (
          <OtpScreen
            studentId={tempStudentId}
            onVerified={handleLoginSuccess}
            onBack={() => setAuthScreen("login")}
          />
        )}
      </>
    )
  }

  // --- APP PRINCIPAL (LOGUEADO) ---
  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-background">
        {renderScreen()}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  )
}
