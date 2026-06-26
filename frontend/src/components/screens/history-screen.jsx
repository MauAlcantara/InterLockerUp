'use client'

import { useState, useEffect, useCallback } from "react"
import { Lock, Unlock, Clock, Calendar, Filter } from "lucide-react"
import { Card, CardContent } from "../ui/card"
import Button from "../ui/button"
import { cn } from "../../lib/utils"

const api = import.meta.env.VITE_API_URL

export function HistoryScreen() {
  const [filter, setFilter] = useState("all")
  const [history, setHistory] = useState([])

  const colors = {
    primary: "#0b4dbb",
    secondary: "#1f78ff",
    warning: "#f2b705",
    backgroundSoft: "#eaf2ff",
    textMain: "#2e2e2e",
    textSecondary: "#8a8a8a"
  }

  const cargarHistorial = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${api}/api/history`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })
      const data = await res.json()
      const formatted = []

      data.requests.forEach(r => {
        formatted.push({
          id: "req_" + r.id,
          type: "request",
          action: "Solicitud de casillero",
          locker: r.locker_id,
          timestamp: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(r.created_at).toLocaleDateString()
        })
      })

      data.access_logs.forEach(log => {
        formatted.push({
          id: "log_" + log.id,
          type: "access",
          action: log.accion,
          locker: log.locker || log.assignment_id,
          edificio: log.edificio,
          timestamp: new Date(log.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(log.fecha_hora).toLocaleDateString()
        })
      })

      formatted.sort((a, b) => new Date(b.date + " " + b.timestamp) - new Date(a.date + " " + a.timestamp))
      setHistory(formatted)
    } catch (error) {
      console.error("Error cargando historial:", error)
    }
  }, [])

  useEffect(() => {
    cargarHistorial()
  }, [cargarHistorial])

  const filteredHistory = filter === "all" ? history : history.filter(item => item.type === filter)

  const groupedHistory = filteredHistory.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push(item)
    return acc
  }, {})

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "90px", background: "#f8f9fb", fontFamily: "'Roboto', sans-serif" }}>
      
      <header style={{ background: colors.primary, color: "white", padding: "56px 16px 32px" }}>
        <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: "20px" }}>
          Historial de Uso
        </h1>

        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          {["all", "access", "request"].map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                borderRadius: "20px",
                padding: "6px 16px",
                fontSize: "13px",
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                border: "none",
                background: filter === f ? "white" : "rgba(255,255,255,0.15)",
                color: filter === f ? colors.primary : "white",
                transition: "all 0.2s"
              }}
            >
              {f === "all" ? "Todos" : f === "access" ? "Accesos" : "Solicitudes"}
            </Button>
          ))}
        </div>
      </header>

      <main style={{ padding: "0 16px", marginTop: "-20px" }}>
        
        {/* STATS CARD CORREGIDA: display flex y flex: 1 para alineación horizontal */}
        <Card style={{ borderRadius: "16px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "20px" }}>
          <CardContent style={{ padding: "20px 10px", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
            
            <div style={{ textAlign: "center", flex: 1 }}>
              <p style={{ fontSize: "22px", fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: colors.primary, margin: 0, lineHeight: 1 }}>
                {history.filter(h => h.type === "access").length}
              </p>
              <p style={{ fontSize: "10px", color: colors.textSecondary, textTransform: "uppercase", fontWeight: 700, marginTop: "6px", marginBottom: 0 }}>Accesos</p>
            </div>

            <div style={{ textAlign: "center", flex: 1, borderLeft: "1px solid #eee", borderRight: "1px solid #eee" }}>
              <p style={{ fontSize: "22px", fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: colors.warning, margin: 0, lineHeight: 1 }}>
                {history.filter(h => h.type === "request").length}
              </p>
              <p style={{ fontSize: "10px", color: colors.textSecondary, textTransform: "uppercase", fontWeight: 700, marginTop: "6px", marginBottom: 0 }}>Solicitudes</p>
            </div>

            <div style={{ textAlign: "center", flex: 1 }}>
              <p style={{ fontSize: "22px", fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: colors.textMain, margin: 0, lineHeight: 1 }}>
                {Object.keys(groupedHistory).length}
              </p>
              <p style={{ fontSize: "10px", color: colors.textSecondary, textTransform: "uppercase", fontWeight: 700, marginTop: "6px", marginBottom: 0 }}>Días</p>
            </div>

          </CardContent>
        </Card>

        {/* Lista de Actividad */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {Object.entries(groupedHistory).map(([date, items]) => (
            <div key={date}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Calendar size={14} color={colors.textSecondary} />
                <h3 style={{ fontSize: "13px", fontWeight: 600, color: colors.textSecondary, fontFamily: "'Montserrat', sans-serif", margin: 0 }}>
                  {date}
                </h3>
              </div>

              <Card style={{ borderRadius: "12px", border: "none", overflow: "hidden" }}>
                <CardContent style={{ padding: 0 }}>
                  {items.map((item, idx) => (
                    <div key={item.id} style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "12px", 
                      padding: "16px", 
                      borderBottom: idx !== items.length - 1 ? "1px solid #f0f0f0" : "none" 
                    }}>
                      <div style={{ 
                        width: "40px", 
                        height: "40px", 
                        borderRadius: "50%", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        background: item.type === "access" ? colors.backgroundSoft : "#fff9e6",
                        color: item.type === "access" ? colors.primary : colors.warning
                      }}>
                        {item.type === "access" ? <Unlock size={18} /> : <Lock size={18} />}
                      </div>

                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "14px", fontWeight: 500, color: colors.textMain, margin: 0 }}>
                          {item.action}
                        </p>
                        <p style={{ fontSize: "12px", color: colors.textSecondary, margin: "2px 0 0" }}>
                          Locker {item.locker} {item.edificio ? `• ${item.edificio}` : ""}
                        </p>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: colors.textSecondary }}>
                          {item.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {filteredHistory.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: "64px", height: "64px", background: "#f0f0f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Filter size={32} color={colors.textSecondary} />
            </div>
            <p style={{ color: colors.textSecondary, fontSize: "14px" }}>
              No se encontraron registros en esta categoría
            </p>
          </div>
        )}
      </main>
    </div>
  )
}