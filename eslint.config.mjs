// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default [
  {
    ignores: ['eslint.config.mjs', 'dist/', 'node_modules/', 'coverage/', '.prisma/', '*.config.*'],
  },
  {
    files: ['**/*.ts'],
    ...eslint.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      ecmaVersion: 2022,
    },
    rules: {
      'no-explicit-any': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  eslintPluginPrettierRecommended,
];