import React, { useContext } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { SearchIcon } from "lucide-react";
import { ThemeContext } from "../theme/themeProvider";

function Command({ children, style = {}, ...props }) {

  const theme = useContext(ThemeContext);

  return (
    <CommandPrimitive
      {...props}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: "8px",
        backgroundColor: "#ffffff",
        overflow: "hidden",
        ...style
      }}
    >
      {children}
    </CommandPrimitive>
  );
}

function CommandInput({ style = {}, ...props }) {

  const theme = useContext(ThemeContext);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.xs,
        borderBottom: `1px solid ${theme.colors.textSecondary}`,
        padding: theme.spacing.sm
      }}
    >
      <SearchIcon size={16} color={theme.colors.textSecondary} />

      <CommandPrimitive.Input
        {...props}
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize
        }}
      />
    </div>
  );
}

function CommandList({ children, style = {}, ...props }) {

  return (
    <CommandPrimitive.List
      {...props}
      style={{
        maxHeight: "300px",
        overflowY: "auto",
        ...style
      }}
    >
      {children}
    </CommandPrimitive.List>
  );
}

function CommandEmpty(props) {

  const theme = useContext(ThemeContext);

  return (
    <CommandPrimitive.Empty
      {...props}
      style={{
        padding: theme.spacing.md,
        textAlign: "center",
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        color: theme.colors.textSecondary
      }}
    />
  );
}

function CommandGroup({ children, style = {}, ...props }) {

  const theme = useContext(ThemeContext);

  return (
    <CommandPrimitive.Group
      {...props}
      style={{
        padding: theme.spacing.xs,
        ...style
      }}
    >
      {children}
    </CommandPrimitive.Group>
  );
}

function CommandItem({ children, style = {}, ...props }) {

  const theme = useContext(ThemeContext);

  return (
    <CommandPrimitive.Item
      {...props}
      style={{
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.xs,
        padding: theme.spacing.sm,
        borderRadius: "6px",
        cursor: "pointer",
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        ...style
      }}
    >
      {children}
    </CommandPrimitive.Item>
  );
}

function CommandSeparator(props) {

  const theme = useContext(ThemeContext);

  return (
    <CommandPrimitive.Separator
      {...props}
      style={{
        height: "1px",
        backgroundColor: theme.colors.textSecondary,
        margin: `${theme.spacing.xs} 0`
      }}
    />
  );
}

function CommandShortcut({ children, style = {}, ...props }) {

  const theme = useContext(ThemeContext);

  return (
    <span
      {...props}
      style={{
        marginLeft: "auto",
        fontSize: "12px",
        color: theme.colors.textSecondary,
        ...style
      }}
    >
      {children}
    </span>
  );
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut
};