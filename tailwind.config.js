/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        p: {
          bg: 'rgb(var(--pc-bg) / <alpha-value>)',
          surface: 'rgb(var(--pc-panel) / <alpha-value>)',
          panel: 'rgb(var(--pc-panel) / <alpha-value>)',
          soft: 'rgb(var(--pc-panel2) / <alpha-value>)',
          panel2: 'rgb(var(--pc-panel2) / <alpha-value>)',
          line: 'rgb(var(--pc-line) / <alpha-value>)',
          ink: 'rgb(var(--pc-fg) / <alpha-value>)',
          fg: 'rgb(var(--pc-fg) / <alpha-value>)',
          ink2: 'rgb(var(--pc-ink2) / <alpha-value>)',
          mute: 'rgb(var(--pc-muted) / <alpha-value>)',
          muted: 'rgb(var(--pc-muted) / <alpha-value>)',
          faint: 'rgb(var(--pc-faint) / <alpha-value>)',
          accent: 'rgb(var(--pc-accent) / <alpha-value>)',
          'accent-ink': 'rgb(var(--pc-accent-ink) / <alpha-value>)',
          series: 'rgb(var(--pc-series) / <alpha-value>)',
          good: 'rgb(var(--pc-good) / <alpha-value>)',
          warn: 'rgb(var(--pc-warn) / <alpha-value>)',
          bad: 'rgb(var(--pc-bad) / <alpha-value>)',
          info: 'rgb(var(--pc-info) / <alpha-value>)',
          green: '#0eb981',
          'green-hover': '#0ca674',
          'green-ink': 'var(--p-green-ink)',
          'green-soft': 'var(--p-green-soft)',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter Tight', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
