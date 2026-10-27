/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        daiso: {
          red: '#D61B23',
          redHover: '#B8131B',
          redLight: '#FFEBE9',
          indigo: '#3A4454',
          cyan: '#0D9488',
          canvas: '#F4F5F7',
          surface: '#FFFFFF',
          border: 'rgba(58, 68, 84, 0.12)'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
