import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Cowork-style warm desktop palette
        paper: "#faf9f5", // main canvas
        side: "#f0eee6", // sidebar
        field: "#f7f6f1", // inset fields / wells
        ink: "#1f1e1b", // primary text
        soft: "#6f6c5f", // muted text
        line: "#e6e3d8", // hairline borders
        accent: "#d97757", // coral accent
        "accent-deep": "#c05f3d",
        moss: "#4e7a5a",
        rust: "#b04a30",
        sky: "#4a7fa5",
        gold: "#a87d2e",
        plum: "#6b4c7b"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(31, 30, 27, 0.05)",
        pop: "0 4px 16px rgba(31, 30, 27, 0.10)"
      },
      fontFamily: {
        display: ['"Iowan Old Style"', "Georgia", '"Times New Roman"', "serif"],
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "sans-serif"
        ]
      },
      fontSize: {
        "2xs": ["11px", "16px"],
        xs: ["12px", "17px"],
        sm: ["13px", "19px"],
        base: ["14px", "21px"]
      }
    }
  },
  plugins: []
};

export default config;
