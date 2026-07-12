import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// Lint only the web app source (TypeScript + React).
export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The app deliberately syncs state from the URL / props in effects
      // (Search filters, Venue prefill, auth bootstrap). The compiler-era
      // rule flags all of them; rules-of-hooks + exhaustive-deps stay on.
      'react-hooks/set-state-in-effect': 'off',
      // Uppercase-start identifiers are React components used via JSX, which
      // plain no-unused-vars can't see (same convention as Vite's template).
      '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      // Context files export a provider + hook together by design.
      'react-refresh/only-export-components': 'off',
      // React Compiler is not enabled in this project (plain @vitejs/plugin-react),
      // so manual memoization is legitimate. The preserve-manual-memoization rule
      // assumes the compiler is optimizing these components and falsely flags
      // every useMemo/useCallback as a conflict.
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
)