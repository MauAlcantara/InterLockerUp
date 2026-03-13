import React, { useContext } from "react";
import { ThemeContext } from "../theme/themeProvider";

export function Badge({ variant = "default", children }) {

  const theme = useContext(ThemeContext);

  let background = theme.colors.primary;
  let color = "#ffffff";

  if (variant === "secondary") {
    background = theme.colors.secondary;
  }

  if (variant === "success") {
    background = theme.colors.success;
  }

  if (variant === "warning") {
    background = theme.colors.warning;
  }

  if (variant === "error") {
    background = theme.colors.error;
  }

  if (variant === "outline") {
    background = "transparent";
    color = theme.colors.textPrimary;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 8px",
        borderRadius: "6px",
        fontFamily: "Montserrat",
        fontWeight: 500,
        fontSize: "12px",
        background: background,
        color: color
      }}
    >
      {children}
    </span>
  );
}