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
        bg: '#0a0a0a',
        panel: '#141414',
        'panel-strong': '#1a1a1a',
        border: '#262626',
        'border-strong': '#404040',
        text: '#fafafa',
        muted: '#737373',
        accent: '#3b82f6',
        'accent-hover': '#2563eb',
        discovery: '#eab308',
        ok: '#22c55e',
        warn: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
