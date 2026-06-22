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
        background: {
          DEFAULT: '#0B0F19',
          card: 'rgba(17, 24, 39, 0.7)',
        },
        primary: {
          DEFAULT: '#6366F1', // Indigo
          glow: 'rgba(99, 102, 241, 0.15)',
        },
        secondary: {
          DEFAULT: '#EC4899', // Pink
          glow: 'rgba(236, 72, 153, 0.15)',
        },
        accent: {
          DEFAULT: '#10B981', // Emerald for financial positive
          expense: '#EF4444', // Red for expense
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
