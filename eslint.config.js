import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// video-ad/ and interactive-demo/ are separate sub-projects with their own
// package.json; lint only the app source.
export default [
  { ignores: ['dist', 'video-ad', 'interactive-demo'] },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // The app deliberately syncs state from the URL / props in effects
      // (Search filters, Venue prefill, auth bootstrap). The compiler-era
      // rule flags all of them; rules-of-hooks + exhaustive-deps stay on.
      'react-hooks/set-state-in-effect': 'off',
      // Uppercase-start identifiers are React components used via JSX, which
      // plain no-unused-vars can't see (same convention as Vite's template).
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      // Context files export a provider + hook together by design.
      'react-refresh/only-export-components': 'off',
    },
  },
]
