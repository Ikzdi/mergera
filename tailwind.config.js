/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js}',
    './dist/**/*.html'
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#FAFAF7',
          surface: '#FFFFFF',
          dark: '#1F2937'
        },
        ink: {
          DEFAULT: '#111827',
          muted: '#475569',
          subtle: '#94A3B8'
        },
        line: '#E5E2D9',
        accent: {
          DEFAULT: '#D4A24C',
          hover: '#B8862E',
          soft: '#F5E8C7'
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      letterSpacing: {
        tightish: '-0.01em',
        wideish: '0.08em'
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,24,39,0.04), 0 4px 16px rgba(17,24,39,0.06)',
        nav: '0 4px 24px rgba(17,24,39,0.08)'
      },
      maxWidth: {
        content: '72rem',
        prose: '65ch'
      },
      transitionDuration: {
        DEFAULT: '200ms'
      },
      keyframes: {
        kenburns: {
          '0%': { transform: 'scale(1) translate(0,0)' },
          '100%': { transform: 'scale(1.08) translate(-1%, -1%)' }
        },
        // Slow drift + pull-back on the hero slides.
        // The scale must always out-cover the translate, or the image edge lifts off
        // the section and exposes the background as a grey strip. Worst case is the
        // end frame: overhang = (1.10-1)/2 = 5% vs shift = 1.10 x 3% = 3.3% — covered.
        heroRise: {
          '0%': { transform: 'scale(1.20) translateY(3%)' },
          '100%': { transform: 'scale(1.10) translateY(-3%)' }
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        dropdownIn: {
          '0%': { opacity: 0, transform: 'translateY(-6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      },
      animation: {
        kenburns: 'kenburns 20s ease-in-out infinite alternate',
        heroRise: 'heroRise 18s ease-in-out infinite alternate',
        fadeUp: 'fadeUp 600ms ease-out both',
        dropdownIn: 'dropdownIn 160ms ease-out both'
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
