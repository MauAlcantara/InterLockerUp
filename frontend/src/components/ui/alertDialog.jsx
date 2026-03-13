import React, { useContext } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { ThemeContext } from "../theme/themeProvider";

export function AlertDialog(props) {
  return <AlertDialogPrimitive.Root {...props} />;
}

export function AlertDialogTrigger(props) {
  return <AlertDialogPrimitive.Trigger {...props} />;
}

export function AlertDialogPortal(props) {
  return <AlertDialogPrimitive.Portal {...props} />;
}

export function AlertDialogOverlay(props) {

  return (
    <AlertDialogPrimitive.Overlay
      {...props}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 50
      }}
    />
  );
}

export function AlertDialogContent({ children }) {

  const theme = useContext(ThemeContext);

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />

      <AlertDialogPrimitive.Content
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: "420px",
          background: theme.colors.background,
          borderRadius: "10px",
          border: `1px solid ${theme.colors.backgroundSoft}`,
          padding: theme.spacing.md,
          zIndex: 60
        }}
      >
        {children}
      </AlertDialogPrimitive.Content>

    </AlertDialogPortal>
  );
}

export function AlertDialogHeader({ children }) {

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        textAlign: "left"
      }}
    >
      {children}
    </div>
  );
}

export function AlertDialogFooter({ children }) {

  return (
    <div
      style={{
        marginTop: "16px",
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px"
      }}
    >
      {children}
    </div>
  );
}

export function AlertDialogTitle({ children }) {

  return (
    <AlertDialogPrimitive.Title
      style={{
        fontFamily: "Montserrat",
        fontWeight: 600,
        fontSize: "20px",
        color: "#2e2e2e"
      }}
    >
      {children}
    </AlertDialogPrimitive.Title>
  );
}

export function AlertDialogDescription({ children }) {

  return (
    <AlertDialogPrimitive.Description
      style={{
        fontFamily: "Roboto",
        fontSize: "14px",
        color: "#8a8a8a",
        lineHeight: 1.5
      }}
    >
      {children}
    </AlertDialogPrimitive.Description>
  );
}

export function AlertDialogAction(props) {

  const theme = useContext(ThemeContext);

  return (
    <AlertDialogPrimitive.Action
      {...props}
      style={{
        backgroundColor: theme.colors.primary,
        color: "#ffffff",
        border: "none",
        padding: "8px 16px",
        borderRadius: "8px",
        fontFamily: "Montserrat",
        fontWeight: 600,
        cursor: "pointer"
      }}
    />
  );
}

export function AlertDialogCancel(props) {

  const theme = useContext(ThemeContext);

  return (
    <AlertDialogPrimitive.Cancel
      {...props}
      style={{
        background: "transparent",
        border: `1px solid ${theme.colors.secondary}`,
        color: theme.colors.secondary,
        padding: "8px 16px",
        borderRadius: "8px",
        fontFamily: "Montserrat",
        fontWeight: 600,
        cursor: "pointer"
      }}
    />
  );
}