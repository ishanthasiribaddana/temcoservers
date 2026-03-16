/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Temco Brand — Primary Theme 2 (Blue #0336FF)
        primary: {
          50: '#e8ecff',
          100: '#c5cfff',
          200: '#9dacff',
          300: '#7589ff',
          400: '#4d66ff',
          500: '#0336FF',
          600: '#022de6',
          700: '#0224cc',
          800: '#011bb3',
          900: '#001280',
        },
        // Temco Brand — Primary Theme 1 (Yellow #FFDE03)
        temco: {
          50: '#fffce5',
          100: '#fff8b3',
          200: '#fff380',
          300: '#ffee4d',
          400: '#ffe926',
          500: '#FFDE03',
          600: '#e6c803',
          700: '#ccb102',
          800: '#b39b02',
          900: '#806f01',
        },
        // Temco Brand — Primary Theme 3 (Pink/Magenta #FF0266)
        accent: {
          50: '#ffe5f0',
          100: '#ffb3d1',
          200: '#ff80b3',
          300: '#ff4d94',
          400: '#ff1a76',
          500: '#FF0266',
          600: '#e6025c',
          700: '#cc0252',
          800: '#b30147',
          900: '#800133',
        }
      }
    },
  },
  plugins: [],
}
