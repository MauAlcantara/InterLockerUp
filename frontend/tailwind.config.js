/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      // Tokens idénticos a interlockerup-admin (index.css :root)
      colors: {
        background: "#f8f9fb",
        foreground: "#2e2e2e",
        card: "#ffffff",
        "card-foreground": "#2e2e2e",
        popover: "#ffffff",
        "popover-foreground": "#2e2e2e",
        primary: "#0b4dbb",
        "primary-foreground": "#ffffff",
        secondary: "#1f78ff",
        "secondary-foreground": "#ffffff",
        muted: "#eaf2ff",
        "muted-foreground": "#8a8a8a",
        accent: "#eaf2ff",
        "accent-foreground": "#0b4dbb",
        destructive: "#c94a4a",
        "destructive-foreground": "#ffffff",
        border: "#e5e7eb",
        input: "#e5e7eb",
        ring: "#0b4dbb",
        success: "#2fa4a9",
        warning: "#f2b705",
        error: "#c94a4a"
      },
      fontFamily: {
        // Montserrat como fuente base (igual que el admin)
        sans: ["Montserrat", "sans-serif"],
        serif: ["Roboto", "sans-serif"],
        montserrat: ["Montserrat", "sans-serif"],
        roboto: ["Roboto", "sans-serif"],
        mono: ["Roboto", "monospace"]
      },
      borderRadius: {
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px"
      }
    },
  },
  plugins: [],
}
