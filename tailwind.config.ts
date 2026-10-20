import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14100D",
        espresso: "#1F1712",
        cocoa: "#2C211A",
        bark: "#3B2C22",
        cream: "#F6F0E6",
        ivory: "#FBF8F2",
        sand: "#E9DFD0",
        taupe: "#8A7B6C",
        mute: "#5E5248",
        copper: "#B4642F",
        "copper-dark": "#8F4A1F",
        ember: "#C8722F",
        gold: "#C9A66B",
        sage: "#5F7A5B",
        danger: "#9B3B2A",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      fontSize: {
        base: ["1.0625rem", { lineHeight: "1.6" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,16,13,0.04), 0 8px 24px rgba(20,16,13,0.06)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
