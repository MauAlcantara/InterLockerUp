import React, { useContext } from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { ThemeContext } from "../theme/themeProvider";

export function Breadcrumb({ children }) {
  return (
    <nav aria-label="breadcrumb">
      {children}
    </nav>
  );
}

export function BreadcrumbList({ children }) {

  const theme = useContext(ThemeContext);

  return (
    <ol
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "6px",
        fontFamily: "Roboto",
        fontSize: "14px",
        color: theme.colors.textSecondary
      }}
    >
      {children}
    </ol>
  );
}

export function BreadcrumbItem({ children }) {
  return (
    <li
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px"
      }}
    >
      {children}
    </li>
  );
}

export function BreadcrumbLink({ children, href }) {

  const theme = useContext(ThemeContext);

  return (
    <a
      href={href}
      style={{
        color: theme.colors.secondary,
        textDecoration: "none",
        fontFamily: "Roboto"
      }}
    >
      {children}
    </a>
  );
}

export function BreadcrumbPage({ children }) {

  const theme = useContext(ThemeContext);

  return (
    <span
      style={{
        color: theme.colors.textPrimary,
        fontFamily: "Roboto",
        fontWeight: 500
      }}
    >
      {children}
    </span>
  );
}

export function BreadcrumbSeparator() {

  const theme = useContext(ThemeContext);

  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        color: theme.colors.textSecondary
      }}
    >
      <ChevronRight size={14} />
    </span>
  );
}

export function BreadcrumbEllipsis() {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <MoreHorizontal size={16} />
    </span>
  );
}