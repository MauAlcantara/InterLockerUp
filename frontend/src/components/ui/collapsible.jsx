import React, { useContext } from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ThemeContext } from "../theme/themeProvider";

function Collapsible(props) {
  return (
    <CollapsiblePrimitive.Root
      {...props}
    />
  );
}

function CollapsibleTrigger({ children, style = {}, ...props }) {

  const theme = useContext(ThemeContext);

  return (
    <CollapsiblePrimitive.Trigger
      {...props}
      style={{
        width: "100%",
        textAlign: "left",
        padding: theme.spacing.sm,
        fontFamily: theme.typography.section.fontFamily,
        fontSize: theme.typography.section.fontSize,
        fontWeight: theme.typography.section.fontWeight,
        backgroundColor: theme.colors.backgroundSoft,
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        ...style
      }}
    >
      {children}
    </CollapsiblePrimitive.Trigger>
  );
}

function CollapsibleContent({ children, style = {}, ...props }) {

  const theme = useContext(ThemeContext);

  return (
    <CollapsiblePrimitive.Content
      {...props}
      style={{
        padding: theme.spacing.sm,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        color: theme.colors.textPrimary,
        ...style
      }}
    >
      {children}
    </CollapsiblePrimitive.Content>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };