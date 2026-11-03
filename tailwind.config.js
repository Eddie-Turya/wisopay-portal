/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        p: {
          bg: 'var(--p-bg)',
          surface: 'var(--p-surface)',
          soft: 'var(--p-soft)',
          line: 'var(--p-line)',
          ink: 'var(--p-ink)',
          ink2: 'var(--p-ink2)',
          mute: 'var(--p-mute)',
          green: '#0eb981',
          'green-hover': '#0ca674',
          'green-ink': 'var(--p-green-ink)',
          'green-soft': 'var(--p-green-soft)',
        },
      },
      fontFamily: {
        sans: ['Inter Tight', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
