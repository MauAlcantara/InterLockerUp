"use client"

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Lock,
  Clock,
  LogOut,
  User,
  Unlock,
  ChevronRight,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import Button from "../ui/button";
import { logout } from "../../services/authService";

const api = import.meta.env.VITE_API_URL;

export default function HomeScreen({ onNavigate, onLogout }) {

  const [user, setUser] = useState(null);
  const [locker, setLocker] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotis, setShowNotis] = useState(false);
  const [isLoadingNotis, setIsLoadingNotis] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const colors = {
    primary: "#0b4dbb",
    secondary: "#1f78ff",
    success: "#2fa4a9",
    warning: "#f2b705",
    error: "#c94a4a",
    background: "#eaf2ff",
    text: "#2e2e2e",
    textSecondary: "#8a8a8a"
  };

  /*
   * Estilo por tipo de notificación (un solo lugar para
   * banner, bandeja y detalle, así los tres se ven igual).
   */
  const getTipoInfo = (tipo) =>
    tipo === "warning"
      ? { color: colors.warning, Icon: AlertTriangle, label: "Advertencia" }
      : { color: colors.success, Icon: CheckCircle2, label: tipo === "success" ? "Éxito" : tipo };

  const cargarNotificaciones = useCallback(async () => {
    setIsLoadingNotis(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${api}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok) setNotifications(data);

    } catch (err) {
      console.error("Error notificaciones:", err);
    } finally {
      setIsLoadingNotis(false);
    }

  }, []);

  const cargarHistorialReciente = useCallback(async () => {

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${api}/api/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      const formatted = [];

      if (data.requests) {

        data.requests.forEach(r => {

          formatted.push({
            id: "req_" + r.id,
            action: "Solicitud enviada",
            time: new Date(r.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            }),
            icon: Lock,
            color: colors.warning
          });

        });
      }

      if (data.access_logs) {

        data.access_logs.forEach(log => {

          formatted.push({
            id: "log_" + log.id,
            action: log.accion,
            time: new Date(log.fecha_hora).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            }),
            icon: Unlock,
            color: colors.primary
          });

        });
      }

      setRecentActivity(
        formatted
          .sort((a, b) => b.id.localeCompare(a.id))
          .slice(0, 3)
      );

    } catch (err) {
      console.error("Error cargando actividad:", err);
    }

  }, [colors.warning, colors.primary]);

  useEffect(() => {

    const token = localStorage.getItem("token");

    if (!token) return;

    fetch(`${api}/api/perfil/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {

        if (!res.ok) throw new Error("Sesión expirada");

        return res.json();

      })
      .then(data => setUser(data))

      .catch(err => {

        console.error("Error de sesión:", err);

        localStorage.removeItem("token");

        window.location.href = "/login";

      });

    fetch(`${api}/api/perfil/my-locker`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {

        if (!data) return;

        const lockerData = data.locker !== undefined ? data.locker : data;

        if (!lockerData) return;

        const numeroLocker =
          lockerData.numero ||
          lockerData.identificador ||
          lockerData.number;

        if (numeroLocker) {

          setLocker({
            number: numeroLocker,
            timeLeft: lockerData.timeLeft || 14400,
            totalTime: lockerData.totalTime || 14400,
            building: lockerData.edificio || lockerData.building || "Edificio asignado",
            floor: lockerData.piso || lockerData.floor || "Planta Baja"
          });

        }

      })
      .catch(err => console.error("No se encontró locker activo", err));

    cargarHistorialReciente();
    cargarNotificaciones();

  }, [cargarHistorialReciente, cargarNotificaciones]);

  /*
   * UX: Escape cierra primero el detalle y luego la bandeja.
   */
  useEffect(() => {

    if (!showNotis && !selectedNotification) return;

    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (selectedNotification) setSelectedNotification(null);
      else setShowNotis(false);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);

  }, [showNotis, selectedNotification]);

  const timePercentage =
    locker ? (locker.timeLeft / locker.totalTime) * 100 : 0;

  const daysLeft =
    locker ? Math.ceil(locker.timeLeft / 1440) : 0;

  const getTimeColor = () => {

    if (timePercentage <= 25) return colors.error;

    if (timePercentage <= 50) return colors.warning;

    return colors.success;

  };

  const hasUnread = notifications.some(n => !n.leida);

  /*
   * El banner solo aparece si hay algo sin leer; al abrir la
   * notificación desaparece, igual que el punto de la campana.
   */
  const recordatorio = notifications.find(n => !n.leida);

  const handleLogout = () => {

    localStorage.removeItem("token");

    window.location.href = "/login";

  };

  /*
   * Al seleccionar una notificación:
   * 1. Se marca como leída.
   * 2. Se elimina su indicador rojo.
   * 3. Se actualiza el estado de la campana.
   * 4. Se abre el detalle.
   */
  const handleNotificationClick = (notification) => {

    const notificationUpdated = {
      ...notification,
      leida: true
    };

    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id
          ? notificationUpdated
          : n
      )
    );

    setSelectedNotification(notificationUpdated);

  };

  /* Activar elementos clicables con teclado (Enter / Espacio) */
  const onKeyActivate = (fn) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  const headerBtn = {
    width: 40,
    height: 40,
    borderRadius: "10px",
    background: "rgba(255,255,255,0.12)",
    border: "none",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    position: "relative",
    transition: "background 0.2s ease"
  };

  const headerBtnOver = (e) =>
    e.currentTarget.style.background = "rgba(255,255,255,0.2)";

  const headerBtnOut = (e) =>
    e.currentTarget.style.background = "rgba(255,255,255,0.12)";

  const closeBtn = {
    background: "#f4f5f7",
    border: "none",
    borderRadius: "10px",
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: colors.text,
    transition: "background 0.2s ease",
    flexShrink: 0
  };

  const closeBtnOver = (e) =>
    e.currentTarget.style.background = "#e9ebef";

  const closeBtnOut = (e) =>
    e.currentTarget.style.background = "#f4f5f7";

  return (

    <div
      className="home-screen"
      style={{
        minHeight: "100vh",
        paddingBottom: 90,
        background: "#f8f9fb",
        color: colors.text,
        fontFamily: "'Roboto', sans-serif"
      }}
    >

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header
        style={{
          background: colors.primary,
          color: "white",
          padding: "56px 16px 36px"
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >

          <div>

            <p
              style={{
                fontSize: 13,
                opacity: 0.85,
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 500
              }}
            >
              Hola,
            </p>

            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                fontFamily: "'Montserrat', sans-serif",
                margin: 0
              }}
            >
              {user ? user.nombre_completo.split(' ')[0] : "Usuario"}
            </h1>

          </div>

          <div
            style={{
              display: "flex",
              gap: 8
            }}
          >

            {/* NOTIFICACIONES (mismo tamaño y estilo que perfil y cerrar sesión) */}

            <button
              onClick={() => setShowNotis(true)}
              style={headerBtn}
              onMouseOver={headerBtnOver}
              onMouseOut={headerBtnOut}
              title="Notificaciones"
              aria-label={
                hasUnread
                  ? "Notificaciones, tienes avisos sin leer"
                  : "Notificaciones"
              }
            >

              <Bell size={20} />

              {hasUnread && (

                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 9,
                    height: 9,
                    background: colors.error,
                    borderRadius: "50%",
                    border: `2px solid ${colors.primary}`,
                    boxSizing: "content-box",
                    transform: "translate(25%, -25%)"
                  }}
                />

              )}

            </button>

            {/* PERFIL */}

            <button
              onClick={() => onNavigate("profile")}
              style={headerBtn}
              onMouseOver={headerBtnOver}
              onMouseOut={headerBtnOut}
              title="Perfil"
              aria-label="Perfil"
            >
              <User size={20} />
            </button>

            {/* CERRAR SESIÓN */}

            <button
              onClick={handleLogout}
              style={headerBtn}
              onMouseOver={headerBtnOver}
              onMouseOut={headerBtnOut}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={20} />
            </button>

          </div>

        </div>

      </header>

      {/* =====================================================
          CONTENIDO PRINCIPAL
          ===================================================== */}

      <main
        style={{
          padding: "0 16px",
          marginTop: "-20px",
          display: "flex",
          flexDirection: "column",
          gap: 20
        }}
      >

        {/* ===================================================
            LOCKER
            =================================================== */}

        <Card
          style={{
            borderRadius: "16px",
            border: "none",
            boxShadow: "0 8px 16px rgba(0,0,0,0.06)",
            overflow: "hidden"
          }}
        >

          <div
            style={{
              background: colors.secondary,
              padding: "8px 16px",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >

            <Lock size={12} />

            <span
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}
            >
              Mi locker
            </span>

          </div>

          <CardContent style={{ padding: "20px" }}>

            {locker ? (

              <>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20
                  }}
                >

                  <div>

                    <h2
                      style={{
                        fontSize: 26,
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 700,
                        color: colors.primary,
                        margin: 0
                      }}
                    >
                      Locker {locker.number}
                    </h2>

                    <p
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                        marginTop: 4
                      }}
                    >
                      {locker.building} • {locker.floor}
                    </p>

                  </div>

                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "14px",
                      background: colors.background,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Lock
                      size={26}
                      color={colors.primary}
                    />
                  </div>

                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >

                      <Clock
                        size={16}
                        color={getTimeColor()}
                      />

                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500
                        }}
                      >
                        Tiempo restante
                      </span>

                    </div>

                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: getTimeColor()
                      }}
                    >
                      {daysLeft} días
                    </span>

                  </div>

                  <div
                    style={{
                      height: 8,
                      background: "#f0f0f0",
                      borderRadius: 4,
                      overflow: "hidden"
                    }}
                  >

                    <div
                      style={{
                        width: `${timePercentage}%`,
                        height: "100%",
                        background: getTimeColor(),
                        transition: "width 0.8s ease"
                      }}
                    />

                  </div>

                </div>

              </>

            ) : (

              <div
                style={{
                  textAlign: "center",
                  padding: "10px 0"
                }}
              >

                <p
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginBottom: 16
                  }}
                >
                  No tienes un casillero asignado.
                </p>

                <Button
                  onClick={() => onNavigate("request")}
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: "700",
                    background: colors.primary,
                    color: "white",
                    borderRadius: "12px",
                    height: "48px",
                    width: "100%",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Solicitar Ahora
                </Button>

              </div>

            )}

          </CardContent>

        </Card>

        {/* ===================================================
            AVISO DE NOTIFICACIÓN
            Mismo lenguaje visual que las tarjetas de la pantalla:
            radio 16, sin borde, misma sombra, icono circular de 36
            con fondo al 15% y título 14/600 como "Actividad".
            =================================================== */}

        {recordatorio && (() => {

          const info = getTipoInfo(recordatorio.tipo);

          return (

            <button
              type="button"
              onClick={() => setShowNotis(true)}
              style={{
                width: "100%",
                textAlign: "left",
                font: "inherit",
                color: "inherit",
                background: "#ffffff",
                border: "none",
                borderRadius: "16px",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                animation: "slideIn 0.4s ease-out",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                transition: "box-shadow 0.2s ease"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 8px 16px rgba(0,0,0,0.06)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0,0,0,0.04)";
              }}
              aria-label={`${recordatorio.tipo === "warning" ? "Atención" : info.label}: ${recordatorio.mensaje}. Abrir notificaciones`}
            >

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: `${info.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >

                <info.Icon
                  size={18}
                  color={info.color}
                />

              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0
                }}
              >

                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    margin: 0
                  }}
                >
                  {recordatorio.tipo === "warning" ? "Atención" : info.label}
                </p>

                <p
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    margin: 0,
                    lineHeight: "1.5",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}
                >
                  {recordatorio.mensaje}
                </p>

              </div>

              <ChevronRight
                size={16}
                color={colors.textSecondary}
                style={{ flexShrink: 0 }}
              />

            </button>

          );

        })()}

        {/* ===================================================
            ACTIVIDAD RECIENTE
            =================================================== */}

        <div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              padding: "0 4px"
            }}
          >

            <h3
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 16,
                fontWeight: 700,
                color: colors.text,
                margin: 0
              }}
            >
              Actividad Reciente
            </h3>

            <button
              onClick={() => onNavigate("history")}
              style={{
                background: "none",
                border: "none",
                color: colors.secondary,
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                cursor: "pointer"
              }}
            >
              Ver todo
              <ChevronRight size={16} />
            </button>

          </div>

          <Card
            style={{
              borderRadius: "16px",
              border: "none",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.04)"
            }}
          >

            <CardContent
              style={{
                padding: "8px 16px"
              }}
            >

              {recentActivity.length > 0 ? (

                recentActivity.map((activity, index) => (

                  <div
                    key={activity.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 0",
                      borderBottom:
                        index !== recentActivity.length - 1
                          ? "1px solid #f5f5f5"
                          : "none"
                    }}
                  >

                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background:
                          `${activity.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >

                      <activity.icon
                        size={18}
                        color={activity.color}
                      />

                    </div>

                    <div style={{ flex: 1 }}>

                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          margin: 0
                        }}
                      >
                        {activity.action}
                      </p>

                      <p
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          margin: 0
                        }}
                      >
                        {activity.time}
                      </p>

                    </div>

                  </div>

                ))

              ) : (

                <p
                  style={{
                    textAlign: "center",
                    padding: "20px 0",
                    fontSize: 14,
                    color: colors.textSecondary
                  }}
                >
                  Sin actividad reciente.
                </p>

              )}

            </CardContent>

          </Card>

        </div>

      </main>

      {/* =====================================================
          BANDEJA DE NOTIFICACIONES
          ===================================================== */}

      {showNotis && (

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(12, 25, 45, 0.45)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "flex-end",
            animation: "fadeIn 0.2s ease"
          }}
          onClick={() => setShowNotis(false)}
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Notificaciones"
            style={{
              width: "100%",
              height: "82vh",
              maxHeight: "82vh",
              background: "#ffffff",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 -8px 16px rgba(0,0,0,0.06)",
              animation: "slideUp 0.3s ease-out",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >

            {/* INDICADOR SUPERIOR */}

            <div
              style={{
                width: 42,
                height: 4,
                borderRadius: 10,
                background: "#d9d9d9",
                margin: "10px auto 2px",
                flexShrink: 0
              }}
            />

            {/* CABECERA */}

            <div
              style={{
                padding: "14px 20px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f1f1f1",
                flexShrink: 0
              }}
            >

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12
                }}
              >

                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    background: colors.background,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >

                  <Bell
                    size={18}
                    color={colors.primary}
                  />

                </div>

                <div>

                  <h2
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 700,
                      fontSize: 18,
                      margin: 0,
                      color: colors.text
                    }}
                  >
                    Notificaciones
                  </h2>

                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 12,
                      color: colors.textSecondary
                    }}
                  >
                    Avisos importantes del sistema
                  </p>

                </div>

              </div>

              <button
                onClick={() => setShowNotis(false)}
                style={closeBtn}
                onMouseOver={closeBtnOver}
                onMouseOut={closeBtnOut}
                title="Cerrar notificaciones"
                aria-label="Cerrar notificaciones"
              >
                <X size={18} />
              </button>

            </div>

            {/* CONTENIDO */}

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "4px 20px 24px"
              }}
            >

              {isLoadingNotis ? (

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "70px 20px",
                    gap: 12
                  }}
                >

                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      background: colors.background,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >

                    <Loader2
                      size={22}
                      color={colors.primary}
                      style={{ animation: "spin 1s linear infinite" }}
                    />

                  </div>

                  <span
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary
                    }}
                  >
                    Cargando notificaciones...
                  </span>

                </div>

              ) : notifications.length > 0 ? (

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column"
                  }}
                >

                  {notifications.map((n, index) => {

                    const info = getTipoInfo(n.tipo);

                    return (

                      <div
                        key={n.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNotificationClick(n)}
                        onKeyDown={onKeyActivate(() => handleNotificationClick(n))}
                        style={{
                          padding: "14px 12px",
                          margin: "0 -12px",
                          borderBottom:
                            index !== notifications.length - 1
                              ? "1px solid #f5f5f5"
                              : "none",
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          background: n.leida
                            ? "transparent"
                            : `${colors.primary}05`,
                          borderRadius: "10px",
                          cursor: "pointer",
                          transition: "background 0.2s ease"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background =
                            n.leida
                              ? "#f8f9fb"
                              : `${colors.primary}09`;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background =
                            n.leida
                              ? "transparent"
                              : `${colors.primary}05`;
                        }}
                      >

                        {/* ICONO (igual que Actividad Reciente) */}

                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: `${info.color}15`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}
                        >

                          <info.Icon
                            size={18}
                            color={info.color}
                          />

                        </div>

                        {/* CONTENIDO */}

                        <div
                          style={{
                            flex: 1,
                            minWidth: 0
                          }}
                        >

                          <span
                            style={{
                              display: "block",
                              fontSize: 12,
                              color: info.color,
                              fontWeight: 700,
                              fontFamily: "'Montserrat', sans-serif",
                              marginBottom: 2
                            }}
                          >
                            {info.label}
                          </span>

                          <p
                            style={{
                              fontSize: 14,
                              margin: 0,
                              color: colors.text,
                              fontWeight: n.leida ? 400 : 600,
                              lineHeight: "1.5",
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden"
                            }}
                          >
                            {n.mensaje}
                          </p>

                        </div>

                        {/* INDICADOR DE NO LEÍDA + FLECHA */}

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexShrink: 0
                          }}
                        >

                          {!n.leida && (

                            <span
                              aria-label="Sin leer"
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: colors.error
                              }}
                            />

                          )}

                          <ChevronRight
                            size={16}
                            color={colors.textSecondary}
                          />

                        </div>

                      </div>

                    );

                  })}

                </div>

              ) : (

                <div
                  style={{
                    minHeight: 280,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "40px 20px"
                  }}
                >

                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "#f4f6f8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16
                    }}
                  >

                    <Bell
                      size={27}
                      color="#a5aab1"
                    />

                  </div>

                  <p
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 700,
                      fontSize: 15,
                      color: colors.text,
                      margin: "0 0 5px"
                    }}
                  >
                    Todo está al día
                  </p>

                  <p
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      margin: 0,
                      lineHeight: "1.5"
                    }}
                  >
                    No tienes notificaciones pendientes.
                  </p>

                </div>

              )}

            </div>

            {/* PIE */}

            {notifications.length > 0 &&
              !isLoadingNotis && (

                <div
                  style={{
                    padding: "10px 20px max(16px, env(safe-area-inset-bottom))",
                    borderTop: "1px solid #f1f1f1",
                    background: "#ffffff",
                    flexShrink: 0
                  }}
                >

                  <p
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      color: colors.textSecondary,
                      margin: 0
                    }}
                  >
                    Toca una notificación para consultar su información.
                  </p>

                </div>

              )}

          </div>

        </div>

      )}

      {/* =====================================================
          DETALLE DE NOTIFICACIÓN
          ===================================================== */}

      {selectedNotification && (() => {

        const info = getTipoInfo(selectedNotification.tipo);

        return (

          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              background: "rgba(12, 25, 45, 0.45)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "flex-end",
              animation: "fadeIn 0.2s ease"
            }}
            onClick={() => setSelectedNotification(null)}
          >

            <div
              role="dialog"
              aria-modal="true"
              aria-label="Detalle de notificación"
              style={{
                width: "100%",
                maxHeight: "75vh",
                overflowY: "auto",
                background: "#ffffff",
                borderTopLeftRadius: "16px",
                borderTopRightRadius: "16px",
                padding: "12px 20px max(28px, env(safe-area-inset-bottom))",
                boxShadow: "0 -8px 16px rgba(0,0,0,0.06)",
                animation: "slideUp 0.3s ease-out"
              }}
              onClick={(e) => e.stopPropagation()}
            >

              {/* INDICADOR SUPERIOR */}

              <div
                style={{
                  width: 42,
                  height: 4,
                  borderRadius: 10,
                  background: "#d9d9d9",
                  margin: "0 auto 20px"
                }}
              />

              {/* ENCABEZADO */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20
                }}
              >

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}
                >

                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: `${info.color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >

                    <info.Icon
                      size={18}
                      color={info.color}
                    />

                  </div>

                  <div>

                    <h2
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: 18,
                        fontWeight: 700,
                        margin: 0,
                        color: colors.text
                      }}
                    >
                      Notificación
                    </h2>

                    <span
                      style={{
                        fontSize: 12,
                        color: info.color,
                        fontWeight: 700,
                        fontFamily: "'Montserrat', sans-serif"
                      }}
                    >
                      {info.label}
                    </span>

                  </div>

                </div>

                <button
                  onClick={() => setSelectedNotification(null)}
                  style={closeBtn}
                  onMouseOver={closeBtnOver}
                  onMouseOut={closeBtnOut}
                  title="Cerrar"
                  aria-label="Cerrar detalle"
                >
                  <X size={18} />
                </button>

              </div>

              {/* CONTENIDO */}

              <div
                style={{
                  background: "#f8f9fb",
                  borderRadius: "16px",
                  padding: "16px",
                  marginBottom: 54
                }}
              >

                <p
                  style={{
                    fontSize: 14,
                    color: colors.text,
                    lineHeight: "1.6",
                    margin: 0,
                    wordBreak: "break-word",
                  }}
                >
                  {selectedNotification.mensaje}
                </p>

              </div>

              {/* ESTADO */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 4px"
                }}
              >

                <CheckCircle2
                  size={16}
                  color={colors.success}
                />

                <span
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary
                  }}
                >
                  Notificación leída
                </span>

              </div>

            </div>

          </div>

        );

      })()}

      {/* =====================================================
          ANIMACIONES Y FOCO
          (style normal: styled-jsx no funciona con Vite)
          ===================================================== */}

      <style>{`

        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.7; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .home-screen button:focus-visible,
        .home-screen [role="button"]:focus-visible {
          outline: 2px solid ${colors.secondary};
          outline-offset: 2px;
        }

        .home-screen header button:focus-visible {
          outline-color: #ffffff;
        }

        @media (prefers-reduced-motion: reduce) {
          .home-screen *,
          .home-screen *::before,
          .home-screen *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }

      `}</style>

    </div>

  );
}
