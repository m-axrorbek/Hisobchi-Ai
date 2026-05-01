export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"] ,
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#111111",
          600: "#0a0a0a",
          700: "#000000",
          800: "#000000",
          900: "#000000"
        },
        ink: {
          900: "#0a0a0a",
          800: "#111111",
          700: "#1f1f1f",
          600: "#2a2a2a",
          500: "#404040",
          400: "#5c5c5c",
          300: "#8a8a8a",
          200: "#d4d4d4",
          100: "#f0f0f0",
          50: "#fafafa"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0, 0, 0, 0.08)",
        lift: "0 18px 40px rgba(0, 0, 0, 0.12)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem"
      },
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
        body: ["Manrope", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};
