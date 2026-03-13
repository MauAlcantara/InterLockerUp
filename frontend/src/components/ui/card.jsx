import { useContext } from "react";
import { ThemeContext } from "../theme/themeProvider";


function Card({ children, style, ...props }) {

  const theme = useContext(ThemeContext);

  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        borderRadius: "12px",
        border: `1px solid ${theme.colors.backgroundSoft}`,
        padding: theme.spacing.cardPadding,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        width: "100%",
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, style }) {

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        ...style
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children, style }) {

  const theme = useContext(ThemeContext);

  return (
    <div
      style={{
        fontFamily: "Montserrat",
        fontWeight: 600,
        fontSize: "18px",
        color: theme.colors.textPrimary,
        ...style
      }}
    >
      {children}
    </div>
  );
}

function CardDescription({ children, style }) {

  const theme = useContext(ThemeContext);

  return (
    <div
      style={{
        fontFamily: "Roboto",
        fontSize: "14px",
        color: theme.colors.textSecondary,
        ...style
      }}
    >
      {children}
    </div>
  );
}

function CardContent({ children, style }) {

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        ...style
      }}
    >
      {children}
    </div>
  );
}

function CardFooter({ children, style }) {

  return (
    <div
      style={{
        marginTop: "8px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        ...style
      }}
    >
      {children}
    </div>
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
};