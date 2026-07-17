module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: 'rgb(var(--color-base) / <alpha-value>)',
          soft: 'rgb(var(--color-base-soft) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          soft: 'rgb(var(--color-surface-soft) / <alpha-value>)',
          hover: 'rgb(var(--color-surface-hover) / <alpha-value>)',
          border: 'var(--color-surface-border)',
          borderStrong: 'var(--color-surface-border-strong)',
        },
        ink: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          muted: 'rgb(var(--color-ink-muted) / <alpha-value>)',
          faint: 'rgb(var(--color-ink-faint) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          contrast: 'rgb(var(--color-accent-contrast) / <alpha-value>)',
        },
        brand: {
          violet: 'rgb(var(--color-accent) / <alpha-value>)',
          violetSoft: 'rgb(var(--color-accent) / <alpha-value>)',
          blue: 'rgb(var(--color-accent) / <alpha-value>)',
          cyan: 'rgb(var(--color-accent) / <alpha-value>)',
        },
        notify: '#2563EB',
        gold: '#D97706',
        danger: '#DC2626',
        emerald: '#059669',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        sans: [
          'var(--font-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--color-accent) / 0.3), 0 4px 16px -4px rgb(var(--color-accent) / 0.3)',
        glowCyan: '0 0 0 1px rgb(var(--color-accent) / 0.3), 0 4px 16px -4px rgb(var(--color-accent) / 0.3)',
        card: '0 1px 0 0 var(--shadow-card-highlight) inset, 0 2px 10px -4px var(--shadow-card-1), 0 1px 2px var(--shadow-card-2)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, rgb(var(--color-accent)) 0%, rgb(var(--color-accent)) 100%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'highlight-flash': {
          '0%': { backgroundColor: 'rgb(var(--color-accent) / 0.12)' },
          '100%': { backgroundColor: 'rgb(var(--color-accent) / 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'highlight-flash': 'highlight-flash 2.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}
