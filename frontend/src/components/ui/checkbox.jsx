import React, { useContext } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";
import { ThemeContext } from "../theme/themeProvider";

function Checkbox({ className = "", ...props }) {

  const theme = useContext(ThemeContext);

  return (
    <CheckboxPrimitive.Root
      {...props}
      style={{
        width: "18px",
        height: "18px",
        borderRadius: "4px",
        border: `1px solid ${theme.colors.textSecondary}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backgroundColor: "#ffffff",
        transition: "all 0.2s ease"
      }}
      className={className}
    >
      <CheckboxPrimitive.Indicator
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.colors.primary
        }}
      >
        <CheckIcon size={14} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

}

export default Checkbox;