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
        glass: {
          bg: 'rgba(255, 255, 255, 0.45)',
          'bg-dark': 'rgba(7, 12, 22, 0.55)',
          border: 'rgba(255, 255, 255, 0.18)',
          'border-dark': 'rgba(255, 255, 255, 0.06)'
        },
        brand: {
          // New BudgetTracker palette: Deep Emerald + Gold Amber + Cyan
          indigo: '#10b981',     // emerald-500 (primary green - finance money feel)
          violet: '#f59e0b',     // amber-400 (gold - premium wealth tone)
          teal: '#06b6d4',       // cyan-500 (accent)
          dark: '#070c16',       // very deep navy-black
          light: '#f0fdf4',      // emerald-50
          // Keep indigo for backwards compat aliases
          emerald: '#10b981',
          amber: '#f59e0b',
          cyan: '#06b6d4',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(16, 185, 129, 0.06)',
        'glass-glow': '0 8px 32px 0 rgba(16, 185, 129, 0.18)',
        'neon': '0 0 24px rgba(16, 185, 129, 0.35)',
        'neon-teal': '0 0 20px rgba(6, 182, 212, 0.3)',
        'neon-amber': '0 0 20px rgba(245, 158, 11, 0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.08)',
        'card-dark': '0 8px 40px rgba(0,0,0,0.45)',
      },
      backdropBlur: {
        'glass': '16px',
        'xs': '4px',
      }
    },
  },
  plugins: [],
}
