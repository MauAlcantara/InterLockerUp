import React, { useContext } from "react";
import { ThemeContext } from "../theme/themeProvider";

export function Alert({ variant = "default", children }) {
  const theme = useContext(ThemeContext);

  // Colores extraídos directamente de tu Guía IDGS17
  const statusColors = {
    default: "#0b4dbb",    // Azul Primario
    success: "#2fa4a9",    // Verde Disponible
    warning: "#f2b705",    // Amarillo Advertencia
    error: "#c94a4a",      // Rojo Error
  };

  const border = statusColors[variant] || statusColors.default;
  const background = "#eaf2ff"; // Azul claro (fondos) según página 8
  const color = "#2e2e2e";     // Gris oscuro (texto principal)

  return (
    <div
      role="alert"
      style={{
        width: "100%",
        // Padding interno en containers: 16–24px (Pág 7)
        padding: "16px", 
        borderRadius: "8px", // Bordes redondeados según iconografía y botones
        borderLeft: `5px solid ${border}`, // Acento visual con color de estado
        borderTop: `1px solid ${border}33`, // Borde suave
        borderRight: `1px solid ${border}33`,
        borderBottom: `1px solid ${border}33`,
        background: background,
        fontFamily: "'Roboto', sans-serif",
        fontSize: "14px",
        color: color,
        marginBottom: "16px", // Espaciado entre elementos (Pág 7)
        display: "flex",
        flexDirection: "column",
        textAlign: "left" // Alineación siempre a la izquierda (Pág 15)
      }}
    >
      {children}
    </div>
  );
}

export function AlertTitle({ children }) {
  return (
    <div
      style={{
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 600, // SemiBold según guía para títulos
        fontSize: "18px", // Título de sección (Pág 5)
        color: "#2e2e2e",
        marginBottom: "8px" // Espaciado entre párrafos (Pág 6)
      }}
    >
      {children}
    </div>
  );
}

export function AlertDescription({ children }) {
  return (
    <div
      style={{
        fontFamily: "'Roboto', sans-serif",
        fontWeight: 400, // Regular
        fontSize: "14px", // Cuerpo de texto (Pág 5)
        lineHeight: "1.6", // Interlineado (Pág 5)
        color: "#2e2e2e"
      }}
    >
      {children}
    </div>
  );
}