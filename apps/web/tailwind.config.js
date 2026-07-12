/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg)',
        surface: 'var(--surface)',
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          faint: 'var(--ink-faint)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          press: 'var(--brand-press)',
          soft: 'var(--brand-soft)',
        },
        'brand-2': 'var(--brand-2)',
        gold: 'var(--gold)',
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        tint: 'var(--tint)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
        bar: 'var(--shadow-bar)',
      },
      maxWidth: {
        wrap: 'var(--maxw)',
      },
      backgroundImage: {
        gradient: 'var(--gradient)',
      },
      fontFamily: {
        outfit: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'Courier New', 'monospace'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        inherit: ['inherit'],
      },
    },
  },
  plugins: [],
};
