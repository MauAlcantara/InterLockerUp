/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", 
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0b4dbb",
        secondary: "#1f78ff",
        success: "#2fa4a9",
        warning: "#f2b705",
        error: "#c94a4a",
        background: "#ffffff",
        foreground: "#111827",
        muted: "#f3f4f6",
        "muted-foreground": "#6b7280",
        border: "#d1d5db"
      },
      fontFamily: {
        montserrat: ["Montserrat", "sans-serif"],
        roboto: ["Roboto", "sans-serif"]
      },
      borderRadius: {
        md: "6px",
        lg: "8px"
      }
    },
  },
  plugins: [],
}