/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        cardBg: "var(--card-bg)",
        navbarBg: "var(--navbar-bg)",
        sidebarBg: "var(--sidebar-bg)",
        borderColor: "var(--border)",
        primary: "var(--primary)",
        primaryHover: "var(--primary-hover)",
        secondary: "var(--secondary)",
        success: "var(--success)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        textPrimary: "var(--text-primary)",
        textSecondary: "var(--text-secondary)",
        textMuted: "var(--text-muted)",
        hoverBg: "var(--hover-bg)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        soft: "var(--shadow)",
        softLg: "var(--shadow-lg)",
      },
      borderRadius: {
        '3xl': '18px',
      }
    },
  },
  plugins: [],
}
