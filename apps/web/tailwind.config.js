/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(250 249 246 / <alpha-value>)',
        surface: 'rgb(255 255 255 / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(18 16 22 / <alpha-value>)',
          soft: 'rgb(94 90 101 / <alpha-value>)',
          faint: 'rgb(152 148 160 / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'rgb(194 90 30 / <alpha-value>)',
          press: 'rgb(163 71 18 / <alpha-value>)',
          soft: 'rgb(252 245 240 / <alpha-value>)',
        },
        'brand-2': 'rgb(28 77 56 / <alpha-value>)',
        gold: 'rgb(223 158 34 / <alpha-value>)',
        line: {
          DEFAULT: 'rgb(232 229 222 / <alpha-value>)',
          strong: 'rgb(208 203 192 / <alpha-value>)',
        },
        tint: 'rgb(243 241 235 / <alpha-value>)',
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
