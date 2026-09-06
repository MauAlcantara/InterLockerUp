import { useContext } from "react";
import { ThemeContext } from "../theme/themeProvider";

function Button({
  children,
  variant = "primary",
  size = "default",
  style,
  ...props
}) {

  const theme = useContext(ThemeContext);

  const variants = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: "#ffffff",
      border: "none"
    },
    secondary: {
      backgroundColor: "transparent",
      color: theme.colors.secondary,
      border: `2px solid ${theme.colors.secondary}`
    },
    danger: {
      backgroundColor: theme.colors.error,
      color: "#ffffff",
      border: "none"
    }
  };

  const sizes = {
    default: {
      height: "48px",
      padding: `${theme.spacing.buttonPaddingVertical} ${theme.spacing.buttonPaddingHorizontal}`,
      fontSize: "16px"
    },
    small: {
      height: "36px",
      padding: "6px 12px",
      fontSize: "14px"
    },
    large: {
      height: "56px",
      padding: "12px 20px",
      fontSize: "18px"
    }
  };

  return (
    <button
      style={{
        width: "100%",
        fontFamily: "Montserrat",
        fontWeight: 600,
        borderRadius: "8px",
        cursor: "pointer",
        transition: "opacity 0.2s ease",
        ...variants[variant],
        ...sizes[size],
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;