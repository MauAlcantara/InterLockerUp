import { useContext } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { ThemeContext } from "../theme/themeProvider";
import Button from "./button";

function Calendar({ selected, onSelect }) {

  const theme = useContext(ThemeContext);

  const styles = {
    container: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.sm,
      borderRadius: "12px",
      fontFamily: "Roboto",
      width: "100%"
    },

    caption: {
      fontFamily: "Montserrat",
      fontWeight: 600,
      fontSize: "16px",
      marginBottom: "8px",
      color: theme.colors.textPrimary
    },

    day: {
      borderRadius: "8px"
    },

    selected: {
      backgroundColor: theme.colors.primary,
      color: "#ffffff"
    },

    today: {
      border: `2px solid ${theme.colors.secondary}`
    }

  };

  return (

    <div style={styles.container}>

      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        showOutsideDays

        styles={{
          caption: styles.caption,
          day: styles.day,
          day_selected: styles.selected,
          day_today: styles.today
        }}

        components={{
          IconLeft: () => <Button size="small">◀</Button>,
          IconRight: () => <Button size="small">▶</Button>
        }}

      />

    </div>

  );

}

export default Calendar;