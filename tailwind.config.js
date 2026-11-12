/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neutral: {
          950: '#08080b',
          900: '#12121a',
          850: '#161622',
          800: '#1f1f2e',
        },
        adventura: {
          red: '#F0281F',
          'red-light': '#FF3B3B',
          'red-dark': '#8C1414',
          emerald: '#10B981',
        },
      },
      fontFamily: {
        serif: ['Cinzel', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'red-glow': '0 0 25px rgba(240, 40, 31, 0.45)',
        'red-glow-strong': '0 0 50px rgba(240, 40, 31, 0.75)',
        'emerald-glow': '0 0 15px rgba(16, 185, 129, 0.6)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
};
