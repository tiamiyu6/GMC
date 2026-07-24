import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf3",
          100: "#d6f5e1",
          200: "#aeebc7",
          300: "#7adca8",
          400: "#46c584",
          500: "#22a866",
          600: "#158752",
          700: "#126b43",
          800: "#125538",
          900: "#0f452f",
          950: "#07271b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
