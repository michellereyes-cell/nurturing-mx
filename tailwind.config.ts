import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nimbus: {
          primary: "#0059d5",
          "primary-hover": "#00429f",
          "primary-pressed": "#00347d",
          surface: "#eef5ff",
          "text-high": "#000b19",
          success: "#00a650",
          warning: "#ffc107",
          danger: "#e74c3c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
