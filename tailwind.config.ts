import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        paper: "#fbfaf7",
        bone: "#efeee8",
        acid: "#d7ff38",
        flame: "#ff5630",
        cobalt: "#2157ff",
      },
      fontFamily: {
        sans: ["Inter", "Arial", "Helvetica", "sans-serif"],
        display: ["Space Grotesk", "Arial Black", "Arial", "sans-serif"],
      },
      boxShadow: {
        hard: "6px 6px 0 #111111",
        soft: "0 18px 60px rgba(17, 17, 17, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
