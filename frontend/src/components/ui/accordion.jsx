import React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { useContext } from "react";
import { ThemeContext } from "../../theme/themeProvider";

export function Accordion(props) {
  return <AccordionPrimitive.Root {...props} />;
}

export function AccordionItem({ children }) {

  const theme = useContext(ThemeContext);

  return (
    <AccordionPrimitive.Item
      style={{
        borderBottom: `1px solid ${theme.colors.backgroundSoft}`
      }}
    >
      {children}
    </AccordionPrimitive.Item>
  );
}

export function AccordionTrigger({ children }) {

  const theme = useContext(ThemeContext);

  return (
    <AccordionPrimitive.Header style={{ display: "flex" }}>
      <AccordionPrimitive.Trigger
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: theme.spacing.sm,
          fontFamily: "Montserrat",
          fontSize: "16px",
          fontWeight: 600,
          color: theme.colors.textPrimary,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left"
        }}
      >
        {children}

        <ChevronDown
          size={18}
          color={theme.colors.textSecondary}
        />

      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ children }) {

  const theme = useContext(ThemeContext);

  return (
    <AccordionPrimitive.Content
      style={{
        overflow: "hidden"
      }}
    >
      <div
        style={{
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
          fontFamily: "Roboto",
          fontSize: "14px",
          color: theme.colors.textSecondary,
          lineHeight: 1.5
        }}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}