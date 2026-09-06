import React, { useContext } from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { ThemeContext } from "../theme/themeProvider";

function ContextMenu(props) {
  return <ContextMenuPrimitive.Root {...props} />;
}

function ContextMenuTrigger(props) {
  return <ContextMenuPrimitive.Trigger {...props} />;
}

function ContextMenuGroup(props) {
  return <ContextMenuPrimitive.Group {...props} />;
}

function ContextMenuPortal(props) {
  return <ContextMenuPrimitive.Portal {...props} />;
}

function ContextMenuSub(props) {
  return <ContextMenuPrimitive.Sub {...props} />;
}

function ContextMenuRadioGroup(props) {
  return <ContextMenuPrimitive.RadioGroup {...props} />;
}

function ContextMenuSubTrigger({ children, inset, style = {}, ...props }) {
  const theme = useContext(ThemeContext);

  return (
    <ContextMenuPrimitive.SubTrigger
      {...props}
      style={{
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.xs,
        padding: theme.spacing.sm,
        paddingLeft: inset ? "32px" : theme.spacing.sm,
        borderRadius: "6px",
        cursor: "pointer",
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        ...style
      }}
    >
      {children}
      <ChevronRightIcon size={16} style={{ marginLeft: "auto" }} />
    </ContextMenuPrimitive.SubTrigger>
  );
}

function ContextMenuSubContent({ style = {}, ...props }) {
  const theme = useContext(ThemeContext);

  return (
    <ContextMenuPrimitive.SubContent
      {...props}
      style={{
        minWidth: "160px",
        borderRadius: "8px",
        padding: theme.spacing.xs,
        backgroundColor: theme.colors.background,
        border: `1px solid ${theme.colors.textSecondary}`,
        ...style
      }}
    />
  );
}

function ContextMenuContent({ style = {}, ...props }) {
  const theme = useContext(ThemeContext);

  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        {...props}
        style={{
          minWidth: "160px",
          maxHeight: "300px",
          overflowY: "auto",
          borderRadius: "8px",
          padding: theme.spacing.xs,
          backgroundColor: theme.colors.background,
          border: `1px solid ${theme.colors.textSecondary}`,
          ...style
        }}
      />
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({ inset, style = {}, ...props }) {
  const theme = useContext(ThemeContext);

  return (
    <ContextMenuPrimitive.Item
      {...props}
      style={{
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.xs,
        padding: theme.spacing.sm,
        paddingLeft: inset ? "32px" : theme.spacing.sm,
        borderRadius: "6px",
        cursor: "pointer",
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        ...style
      }}
    />
  );
}

function ContextMenuCheckboxItem({ children, checked, style = {}, ...props }) {
  const theme = useContext(ThemeContext);

  return (
    <ContextMenuPrimitive.CheckboxItem
      checked={checked}
      {...props}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.xs,
        padding: theme.spacing.sm,
        paddingLeft: "32px",
        borderRadius: "6px",
        cursor: "pointer",
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        ...style
      }}
    >
      <span
        style={{
          position: "absolute",
          left: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon size={14} />
        </ContextMenuPrimitive.ItemIndicator>
      </span>

      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

function ContextMenuRadioItem({ children, style = {}, ...props }) {
  const theme = useContext(ThemeContext);

  return (
    <ContextMenuPrimitive.RadioItem
      {...props}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.xs,
        padding: theme.spacing.sm,
        paddingLeft: "32px",
        borderRadius: "6px",
        cursor: "pointer",
        fontFamily: theme.typography.body.fontFamily,
        fontSize: theme.typography.body.fontSize,
        ...style
      }}
    >
      <span
        style={{
          position: "absolute",
          left: "8px"
        }}
      >
        <ContextMenuPrimitive.ItemIndicator>
          <CircleIcon size={10} />
        </ContextMenuPrimitive.ItemIndicator>
      </span>

      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

function ContextMenuLabel({ inset, style = {}, ...props }) {
  const theme = useContext(ThemeContext);

  return (
    <ContextMenuPrimitive.Label
      {...props}
      style={{
        padding: theme.spacing.sm,
        paddingLeft: inset ? "32px" : theme.spacing.sm,
        fontFamily: theme.typography.section.fontFamily,
        fontSize: theme.typography.section.fontSize,
        fontWeight: theme.typography.section.fontWeight,
        ...style
      }}
    />
  );
}

function ContextMenuSeparator(props) {
  const theme = useContext(ThemeContext);

  return (
    <ContextMenuPrimitive.Separator
      {...props}
      style={{
        height: "1px",
        margin: `${theme.spacing.xs} 0`,
        backgroundColor: theme.colors.textSecondary
      }}
    />
  );
}

function ContextMenuShortcut({ children, style = {}, ...props }) {
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
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup
};