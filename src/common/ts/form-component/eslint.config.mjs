// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import { fixupConfigRules } from '@eslint/compat';
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig, globalIgnores } from 'eslint/config';
import pluginImport from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import storybook from 'eslint-plugin-storybook';
import testingLibrary from 'eslint-plugin-testing-library';
import globals from 'globals';
import path from 'node:path';

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
      'simple-import-sort': simpleImportSort,
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      sonarjs,
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
      curly: ['error', 'all'],
      'object-shorthand': ['error', 'always'],
      'arrow-body-style': ['error', 'as-needed'],
      'no-dupe-class-members': ['off'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['off'],
      'prefer-template': ['warn'],

      'jsx-a11y/no-autofocus': ['off'],

      // TypeScript accepts any path to a CSS module, so this catches wrong relative paths. TypeScript checks the rest.
      'import/no-unresolved': ['error', { ignore: ['^[^.]'] }],
      'import/no-default-export': ['error'],
      // Ensures this package declares everything it imports, instead of relying on what its consumers have installed.
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.{ts,tsx}',
            '**/*.stories.{ts,tsx}',
            'src/test/**',
            'src/**/storybook/**',
            '.storybook/**',
            '*.config.{ts,mjs}',
          ].map((glob) => path.join(import.meta.dirname, glob)),
        },
      ],

      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['warn'],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ImportDeclaration[source.value='react'] > :matches(ImportDefaultSpecifier, ImportNamespaceSpecifier)",
          message: "Import what you need by name, such as `import { useState } from 'react'`.",
        },
        {
          selector: "TSQualifiedName[left.name='React']",
          message: "Import the type by name, such as `import type { ReactNode } from 'react'`.",
        },
      ],

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': ['error', { additionalHooks: '^(useMemoDeepEqual)$' }],
      'react/jsx-filename-extension': ['error', { extensions: ['.jsx', '.tsx'] }],
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
      'react/jsx-fragments': ['error'],
      'react/react-in-jsx-scope': 'off',
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

      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000core.js$'],
            ['^react[^\\u0000]*$', '^react.*\\u0000$'],
            ['^\\u0000'],
            ['^@?\\w+[^\\u0000]*$', '^@?\\w+.*\\u0000$'],
            ['^\\.[^\\u0000]*$', '^\\..*\\u0000$'],
            ['^.+\\.(s?css|less)$'],
          ],
        },
      ],
    },
  },
  {
    files: ['vitest.config.ts', '.storybook/**/*', '**/*.stories.{ts,tsx}'],
    rules: {
      'import/no-default-export': ['off'],
    },
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
    files: ['src/codegen/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/**/*.generated.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['src/app-components/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          basePath: import.meta.dirname,
          zones: [
            {
              target: './src/app-components',
              from: './src',
              except: ['./app-components'],
              message:
                'app-components should not import from outside src/app-components/. Keep these components self-contained.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/app-components/Table/BaseTable.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@digdir/designsystemet-react',
              importNames: [
                'Table',
                'TableHead',
                'TableBody',
                'TableFoot',
                'TableRow',
                'TableHeaderCell',
                'TableCell',
              ],
              message:
                'Use BaseTable, so that every table differs from the designsystem in one place.',
            },
          ],
        },
      ],
    },
  },
  ...storybook.configs['flat/recommended'],
]);
