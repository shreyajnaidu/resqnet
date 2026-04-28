/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', '"Inter"', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#06070a',
          900: '#0a0c10',
          800: '#0f1218',
          700: '#161a22',
          600: '#1f242e',
          500: '#2a313d',
        },
        accent: {
          fire: '#ef4444',
          medical: '#06b6d4',
          security: '#f59e0b',
          hazard: '#eab308',
          safe: '#10b981',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'scan': 'scan 2.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scan: {
          '0%, 100%': { transform: 'translateY(0)', opacity: 1 },
          '50%': { transform: 'translateY(100%)', opacity: 0.4 },
        },
      },
    },
  },
  plugins: [],
};
