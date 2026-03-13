import { useContext } from "react";
import { ThemeContext } from "../theme/themeProvider";

function ButtonGroupText({ children, style }) {

  const theme = useContext(ThemeContext);

  return (
    <div
      style={{
        backgroundColor: theme.colors.backgroundSoft,
        border: `1px solid ${theme.colors.secondary}`,
        borderRadius: "8px",
        padding: "8px 16px",
        fontFamily: "Roboto",
        fontSize: "14px",
        color: theme.colors.textPrimary,
        display: "flex",
        alignItems: "center",
        ...style
      }}
    >
      {children}
    </div>
  );
}

export default ButtonGroupText;