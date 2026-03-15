import { useState } from "react"

import BottomNav from "./components/bottom-nav"
import { Toaster } from "react-hot-toast"
import LoginScreen from "./components/screens/login-screen"
import RegisterScreen from "./components/screens/register-screen"
import HomeScreen from "./components/screens/home-screen"
import {RequestScreen} from "./components/screens/request-screen"
import AccessScreen from "./components/screens/access-screen"
import {HistoryScreen} from "./components/screens/history-screen"
import SupportScreen from "./components/screens/support-screen"
import { ProfileScreen } from "./components/screens/ProfileScreen"

export default function App() {
const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem("token");
  })
  const [authScreen, setAuthScreen] = useState("login")
  const [activeTab, setActiveTab] = useState("home")

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false)
    setActiveTab("home")
    setAuthScreen("login")
  }

  if (!isLoggedIn) {
    if (authScreen === "register") {
      return (
<>
<Toaster position="top-center" />
        <RegisterScreen
          onRegister={() => setIsLoggedIn(true)}
          onBackToLogin={() => setAuthScreen("login")}
        />
        </>
      )
    }

    return (
      <>
<Toaster position="top-center" />
      <LoginScreen
        onLogin={() => setIsLoggedIn(true)}
        onGoToRegister={() => setAuthScreen("register")}
      />
      </>
    )
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

  return (
    <div className="min-h-screen bg-background">
      {renderScreen()}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}