/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#000000',
          soft: '#4B5A50',    // secondary text on paper
        },
        paper: '#f7f2ee',
        secondary: '#e35513',
        clay: {
          50: '#fff1ea',
          100: '#ffe1d2',
          200: '#fcc3a6',
          300: '#f89f72',
          400: '#f47a3d',
          500: '#eb641e',
          600: '#e35513',
          700: '#bd3f0e',
          800: '#963311',
        },
        amber: {
          50: '#FDF5E6',
          100: '#FAE9C8',
          200: '#F5D9A2',
          300: '#F0C878',
          400: '#E8B75C',
          500: '#E8A33D', // decorative accent — badges, highlights
          600: '#CC8A2A',
          700: '#A36C1F',
        },
        sage: {
          50: '#F1F4EF',
          100: '#E2E9DE',
          200: '#CDD9C7',
          300: '#B7C6B0',
          400: '#9DB295',
          500: '#7C9473', // secondary accent — dividers, muted states
          600: '#5F7358',
          700: '#4A5A45',
        },
      },
      fontFamily: {
        accent: ['"Dancing Script"', 'cursive'],
        heading: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
