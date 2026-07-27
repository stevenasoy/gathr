/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(252 251 254 / <alpha-value>)',
        surface: 'rgb(255 255 255 / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(45 39 54 / <alpha-value>)',
          soft: 'rgb(110 103 122 / <alpha-value>)',
          faint: 'rgb(162 155 172 / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'rgb(124 58 237 / <alpha-value>)',
          press: 'rgb(109 40 217 / <alpha-value>)',
          soft: 'rgb(245 242 255 / <alpha-value>)',
        },
        'brand-2': 'rgb(236 72 153 / <alpha-value>)',
        gold: 'rgb(223 158 34 / <alpha-value>)',
        line: {
          DEFAULT: 'rgb(240 236 245 / <alpha-value>)',
          strong: 'rgb(220 213 230 / <alpha-value>)',
        },
        tint: 'rgb(246 244 250 / <alpha-value>)',
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
