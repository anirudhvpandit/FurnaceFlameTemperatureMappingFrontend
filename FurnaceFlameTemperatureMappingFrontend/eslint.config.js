import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // FurnaceStore intentionally exports reusable hooks (useFurnaceStore /
      // useEffectiveBurner) alongside its provider component. The default
      // react-refresh rule rejects non-component exports; allow these hook
      // names while keeping everything else strict.
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: ['useFurnaceStore', 'useEffectiveBurner'],
        },
      ],
    },
  },
  // React Native / config files under mobile/ use CommonJS globals
  // (module, require, process). They still use ESM `import` + JSX, so keep
  // module source type and JSX parsing enabled.
  {
    files: ['mobile/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.node, ...globals.es2020 },
    },
  },
])
