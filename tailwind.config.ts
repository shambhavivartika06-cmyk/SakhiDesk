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
        brand: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        cream: {
          50: '#fffdf9',
          100: '#fdfaf5',
          200: '#faf4eb',
          300: '#f3e8d8',
          400: '#ebd8bf',
          500: '#dec4a2',
        },
        sakhi: {
          lavender: '#8b5cf6',
          lavenderLight: '#ede9fe',
          pink: '#ec4899',
          pinkLight: '#fce7f3',
          warm: '#f59e0b',
          warmLight: '#fef3c7',
          deep: '#1e1b4b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(139, 92, 246, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 2px 12px -2px rgba(30, 27, 75, 0.06), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'elevated': '0 12px 30px -4px rgba(139, 92, 246, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
};
export default config;
