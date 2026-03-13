import React, { createContext, useContext } from "react";
import { ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ThemeContext } from "../theme/themeProvider";

const ChartContext = createContext(null);

function useChart() {
  const context = useContext(ChartContext);

  if (!context) {
    throw new Error("Chart components must be inside ChartContainer");
  }

  return context;
}

function ChartContainer({ children, config, style }) {

  const theme = useContext(ThemeContext);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        style={{
          width: "100%",
          height: "250px",
          fontFamily: "Roboto",
          fontSize: "12px",
          color: theme.colors.textPrimary,
          ...style
        }}
      >
        <ResponsiveContainer>
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartTooltipContent({ active, payload, label }) {

  const theme = useContext(ThemeContext);

  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: `1px solid ${theme.colors.secondary}`,
        borderRadius: "8px",
        padding: "8px 12px",
        fontFamily: "Roboto",
        fontSize: "12px"
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "4px" }}>
        {label}
      </div>

      {payload.map((entry, index) => (
        <div key={index} style={{ display: "flex", gap: "6px" }}>
          <div
            style={{
              width: "10px",
              height: "10px",
              backgroundColor: entry.color,
              borderRadius: "2px"
            }}
          />
          <span>{entry.name}: {entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function ChartLegendContent({ payload }) {

  const theme = useContext(ThemeContext);

  if (!payload) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "16px",
        marginTop: "8px",
        fontFamily: "Roboto",
        fontSize: "12px",
        color: theme.colors.textSecondary
      }}
    >
      {payload.map((entry, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              backgroundColor: entry.color,
              borderRadius: "2px"
            }}
          />
          {entry.value}
        </div>
      ))}
    </div>
  );
}

export {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
  Tooltip,
  Legend,
  useChart
};