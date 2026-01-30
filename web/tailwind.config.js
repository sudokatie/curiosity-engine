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
        // Dispatch-inspired palette
        bg: '#1a1a1a',
        'bg-deep': '#141414',
        panel: '#242424',
        'panel-strong': '#2e2e2e',
        border: '#3a3a3a',
        'border-strong': '#4a4a4a',
        
        // Text colors
        text: '#fafafa',
        'text-cream': '#e8d5a8',
        muted: '#8a8a7a',
        'muted-olive': '#6b6b5a',
        
        // Accent - coral/vermillion
        accent: '#e85a3c',
        'accent-hover': '#d14a2c',
        'accent-muted': 'rgba(232, 90, 60, 0.15)',
        
        // Status colors
        discovery: '#e8d5a8',
        ok: '#6bcf9e',
        warn: '#e8a848',
        danger: '#cf6b8a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'sm': '2px',
        DEFAULT: '4px',
        'md': '6px',
        'lg': '8px',
      },
      backgroundImage: {
        'dotted-h': 'repeating-linear-gradient(90deg, #3a3a3a, #3a3a3a 2px, transparent 2px, transparent 8px)',
        'dotted-v': 'repeating-linear-gradient(0deg, #3a3a3a, #3a3a3a 2px, transparent 2px, transparent 8px)',
        'scan-lines': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(232, 90, 60, 0.03) 2px, rgba(232, 90, 60, 0.03) 4px)',
      },
    },
  },
  plugins: [],
}
