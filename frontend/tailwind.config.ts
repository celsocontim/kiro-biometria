import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'mobile': { 'max': '767px' },
        'tablet': { 'min': '768px', 'max': '1024px' },
        'desktop': { 'min': '1025px' },
      },
      colors: {
        primary: {
          DEFAULT: '#00995D',
          50: '#E6F7F0',
          100: '#CCEFE1',
          200: '#99DFC3',
          300: '#66CFA5',
          400: '#33BF87',
          500: '#00995D',
          600: '#007A4A',
          700: '#005C38',
          800: '#003D25',
          900: '#001F13',
        },
      },
    },
  },
  plugins: [],
};

export default config;
