import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import pluginImport from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: pluginImport,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // Ensures this package declares everything it imports, instead of relying on what its consumers have installed.
      'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.ts'] }],
      // TypeScript checks that names exist, and knows the browser globals such as fetch.
      'no-undef': 'off',
    },
  },
];
