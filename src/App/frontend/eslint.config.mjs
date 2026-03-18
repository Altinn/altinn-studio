import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig, globalIgnores } from 'eslint/config';
import pluginCypress from 'eslint-plugin-cypress';
import pluginImport from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import preferredImportPath from 'eslint-plugin-preferred-import-path';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactPlugin from 'eslint-plugin-react';
import reactCompiler from 'eslint-plugin-react-compiler';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import testingLibrary from 'eslint-plugin-testing-library';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import langKey from './src/language/eslint.js';

// eslint-disable-next-line import/no-default-export
export default defineConfig([
  globalIgnores([
    '**/node_modules',
    '**/coverage',
    '**/dist',
    '**/*.snap',
    'src/features/expressions/shared-tests/**/*.json',
    'schemas/**/*.json',
    'webpack*.js', // FIXME: should this be included?
    '.yarn/*',
    'test/e2e/k6-browser/**/*',
  ]),
  js.configs.recommended,
  ...fixupConfigRules(pluginImport.flatConfigs.recommended),
  ...fixupConfigRules(pluginImport.flatConfigs.typescript),
  jsxA11y.flatConfigs.recommended,
  ...fixupConfigRules(reactPlugin.configs.flat.recommended),
  ...tsPlugin.configs['flat/recommended'],
  eslintPluginPrettierRecommended,

  {
    files: ['**/*.{js,cjs,mjs,jsx,ts,tsx}'],
    plugins: {
      'no-relative-import-paths': fixupPluginRules(noRelativeImportPaths),
      'preferred-import-path': preferredImportPath,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-compiler': reactCompiler,
      sonarjs,
      local: {
        rules: {
          'language-key': langKey,
        },
      },
    },
    languageOptions: {
      parser: tsParser,
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
      'local/language-key': ['error'],
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

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': ['error', { additionalHooks: '^(useMemoDeepEqual)$' }],
      'react/jsx-filename-extension': ['error', { extensions: ['.jsx', '.tsx'] }],
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
      'react/jsx-fragments': ['error'],
      'react/jsx-no-useless-fragment': ['error'],
      'react/self-closing-comp': ['warn'],
      'react/jsx-key': [
        'error',
        { checkFragmentShorthand: true, checkKeyMustBeforeSpread: true, warnOnDuplicates: true },
      ],
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

      'react-compiler/react-compiler': 'error',

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
      'testing-library': testingLibrary,
    },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'testing-library/await-async-queries': ['warn'],
      'jsx-a11y/label-has-associated-control': ['off'],
      '@typescript-eslint/consistent-type-imports': ['off'],
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
  {
    files: ['src/**/*.generated.{ts,tsx}'],
    rules: {
      'no-explicit-any': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['src/app-components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: 'src/(?!app-components)',
              message:
                'app-components should not import from outside src/app-components/. Keep these components self-contained.',
            },
          ],
        },
      ],
    },
  },
]);
