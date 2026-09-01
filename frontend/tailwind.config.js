/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        control: {
          bg: "#020617",       // slate-950
          card: "#0f172a",     // slate-900
          border: "#1e293b",   // slate-800
          accent: "#38bdf8",   // sky-400
        },
        railway: {
          dark: "#020617",
          panel: "#0f172a",
          surface: "#1e293b",
          border: "#334155",
          cyan: "#06b6d4",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
        },
      },
    },
  },
  plugins: [],
};
