import { fixupConfigRules, fixupPluginRules, includeIgnoreFile } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import pluginCypress from 'eslint-plugin-cypress/flat';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import preferredImportPath from 'eslint-plugin-preferred-import-path';
import reactPlugin from 'eslint-plugin-react';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import testingLibrary from 'eslint-plugin-testing-library';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});
const gitignorePath = path.resolve(__dirname, '.gitignore');

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  includeIgnoreFile(gitignorePath),
  ...fixupConfigRules(
    compat.extends(
      'eslint:recommended',
      'plugin:import/recommended',
      'plugin:import/typescript',
      'plugin:jsx-a11y/recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:prettier/recommended',
    ),
  ),
  {
    ignores: [
      '**/node_modules',
      '**/coverage',
      '**/dist',
      '**/*.snap',
      'src/features/expressions/shared-tests/**/*.json',
      'schemas/**/*.json',
      'webpack*.js', // FIXME: should this be included?
      '.yarn/*',
    ],
  },

  {
    plugins: {
      sonarjs: fixupPluginRules(sonarjs),
      'no-relative-import-paths': noRelativeImportPaths,
      'preferred-import-path': preferredImportPath,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
      react: fixupPluginRules(reactPlugin),
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
        window: true,
      },
      ecmaVersion: 2020,
      sourceType: 'module',

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    settings: {
      'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
      'import/parsers': {
        '@typescript-eslint/parser': ['.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx'],
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      curly: ['error', 'all'],
      'object-shorthand': ['error', 'always'],
      'arrow-body-style': ['error', 'as-needed'],
      'no-dupe-class-members': ['off'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['off'],
      'prefer-template': ['warn'],
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportAllDeclaration', message: 'Do not re-exports already exported symbols' },
        {
          selector: "ExportNamedDeclaration[source.type='Literal']",
          message: 'Do not re-exports already exported symbols',
        },
      ],

      'jsx-a11y/no-autofocus': ['off'],

      'import/no-unresolved': ['off'],
      'import/no-default-export': ['error'],

      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['warn'],

      'unused-imports/no-unused-imports': ['error'],

      'react-hooks/exhaustive-deps': ['error', { additionalHooks: '^(useMemoDeepEqual)$' }],
      'react/jsx-filename-extension': ['error', { extensions: ['.jsx', '.tsx'] }],
      'react/prop-types': ['off'],

      'sonarjs/no-duplicate-string': ['off'],
      'sonarjs/cognitive-complexity': ['off'],
      'sonarjs/no-collapsible-if': ['warn'],
      'sonarjs/prefer-single-boolean-return': ['warn'],
      'sonarjs/no-identical-functions': ['warn'],
      'sonarjs/no-small-switch': ['warn'],
      'sonarjs/no-nested-template-literals': ['warn'],

      'no-relative-import-paths/no-relative-import-paths': ['warn', { allowSameFolder: false }],

      'preferred-import-path/preferred-import-path': ['warn', { '^/src': 'src', '^/test/': 'test/' }],

      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000core.js$'],
            ['^react[^\\u0000]*$', '^react.*\\u0000$'],
            ['^\\u0000'],
            ['^@?(?!src/|test/)\\w+[^\\u0000]*$', '^@?(?!src/|test/)\\w+.*\\u0000$'],
            ['^\\./?[^\\u0000]*$', '^\\./?.*\\u0000$'],
            ['^test/[^\\u0000]+$', '^test/.*\\u0000$'],
            ['^src/[^\\u0000]+$', '^src/.*\\u0000$'],
            ['^.+\\.(s?css|less)$'],
          ],
        },
      ],
    },
  },
  {
    files: ['test/e2e/**/*.ts'],
    ...pluginCypress.configs.recommended,
  },
  {
    files: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/test/**/*.ts', 'src/**/test/**/*.tsx'],
    plugins: {
      'testing-library': fixupPluginRules(testingLibrary),
    },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'testing-library/await-async-queries': ['warn'],
    },
  },
  {
    files: ['src/layout/*/index.tsx', 'src/layout/LayoutComponent.tsx'],
    rules: {
      'react-hooks/rules-of-hooks': 'off', // FIXME: Refactor to follow rules and remove this rule
    },
  },
  {
    files: ['src/codegen/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
