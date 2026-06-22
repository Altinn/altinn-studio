import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

const restrictedImports = (patterns) => [
  'error',
  {
    patterns,
  },
];

const strictLibraryRules = {
  '@typescript-eslint/explicit-function-return-type': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
};

const importTypescriptConfig = importPlugin.configs?.typescript ?? {};

const storybookConfig = (files) =>
  fixupConfigRules(compat.config({ extends: ['plugin:storybook/recommended'] })).map((config) => ({
    ...config,
    files,
    settings: {
      ...config.settings,
      'testing-library/custom-renders': ['rowsToRender'],
    },
  }));

export default [
  {
    ignores: [
      'yarn/**',
      'yarn.lock',
      '*.css',
      '*.snap',
      'coverage/**',
      '**/*.d.ts',
      'node_modules/**',
      '.eslintrc.js',
      'eslint.config.mjs',
      'dist/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig-eslint.json',
        sourceType: 'module',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': fixupPluginRules(tsPlugin),
      import: fixupPluginRules(importPlugin),
      'jsx-a11y': fixupPluginRules(jsxA11yPlugin),
      react: fixupPluginRules(reactPlugin),
      'react-hooks': fixupPluginRules(reactHooksPlugin),
    },
    settings: {
      ...importTypescriptConfig.settings,
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...importTypescriptConfig.rules,
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react/destructuring-assignment': 'off',
      'react/prop-types': 'error',
      'react/require-default-props': 'off',
      'import/prefer-default-export': 'off',
      'import/no-duplicates': 'error',
      'react/jsx-key': 'error',
      'react/jsx-filename-extension': ['warn', { extensions: ['.tsx'] }],
      'prefer-const': 'error',
      'object-curly-spacing': ['error', 'always'],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-imports': restrictedImports([
        {
          group: ['**/libs/**'],
          message:
            'Use the package name, not the relative path, when importing from a @studio library.',
        },
      ]),
    },
  },
  {
    files: ['**/*.tsx'],
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'no-use-before-define': 'off',
      'no-shadow': 'off',
      'react/function-component-definition': 'off',
      '@typescript-eslint/no-shadow': ['error'],
    },
  },
  ...fixupConfigRules(
    compat.config({
      overrides: [
        {
          files: ['*.test.ts', '*.test.tsx'],
          extends: ['plugin:testing-library/react'],
          rules: { 'testing-library/no-unnecessary-act': 'error' },
        },
      ],
    }),
  ),
  {
    files: ['scripts/**/*.ts', 'scripts/**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './scripts/tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['testing/cypress/src/**/*.js', 'testing/cypress/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: false,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-exports': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: [
      'libs/studio-components/.storybook/**/*.{ts,tsx}',
      'libs/studio-components-legacy/.storybook/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parserOptions: {
        project: false,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-exports': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['libs/studio-assistant/**/*.{ts,tsx}'],
    rules: {
      ...strictLibraryRules,
      'no-restricted-imports': restrictedImports([
        {
          group: ['@tanstack/react-query'],
          message: 'This library should not contain Tanstack query or any other data library.',
        },
        {
          group: ['app-shared/*', '@altinn/*'],
          message: 'This library should not depend on app-specific packages.',
        },
        {
          group: ['i18next', 'react-i18next'],
          message: 'The texts for this library should be passed through the configuration object.',
        },
      ]),
    },
  },
  {
    files: ['libs/studio-browser-storage/**/*.{ts,tsx}'],
    rules: {
      ...strictLibraryRules,
      'no-restricted-imports': restrictedImports([
        {
          group: ['react'],
          message: 'The @studio/browser-storage package should not depend on React.',
        },
        {
          group: ['app-shared/*', '@altinn/*'],
          message:
            'Files in the @studio/browser-storage package should not depend on app-specific packages.',
        },
      ]),
    },
  },
  {
    files: ['libs/studio-components/**/*.{ts,tsx}'],
    settings: {
      'testing-library/custom-renders': ['rowsToRender'],
    },
    rules: {
      ...strictLibraryRules,
      'no-restricted-imports': restrictedImports([
        {
          group: ['@tanstack/react-query'],
          message:
            'In the components library, backend data should be provided as input values to the functions and components that needs them.',
        },
        {
          group: ['app-shared/*', '@altinn/*'],
          message:
            'Files in the @studio/components package should not depend on app-specific packages.',
        },
        {
          group: ['i18next', 'react-i18next'],
          message:
            'In the components library, texts should be provided as input props to the components that needs them.',
        },
        {
          group: ['@studio/components-legacy'],
          message:
            'Files in the @studio/components package should not depend on the @studio/components-legacy package.',
        },
      ]),
    },
  },
  {
    files: ['libs/studio-components/**/*.test.tsx'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  ...storybookConfig(['libs/studio-components/**/*.{stories,story}.{ts,tsx,js,jsx}']),
  {
    files: ['libs/studio-components-legacy/**/*.{ts,tsx}'],
    settings: {
      'testing-library/custom-renders': ['rowsToRender'],
    },
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: ['@tanstack/react-query'],
          message:
            'In the components library, backend data should be provided as input values to the functions and components that needs them.',
        },
        {
          group: ['app-shared/*', '@altinn/*'],
          message:
            'Files in the @studio/components-legacy package should not depend on app-specific packages.',
        },
        {
          group: ['i18next', 'react-i18next'],
          message:
            'In the components library, texts should be provided as input props to the components that needs them.',
        },
        {
          group: ['@studio/components'],
          message:
            'Files in the @studio/components-legacy package should not depend on the @studio/components package.',
        },
      ]),
    },
  },
  {
    files: ['libs/studio-components-legacy/**/*.test.tsx'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  ...storybookConfig(['libs/studio-components-legacy/**/*.{stories,story}.{ts,tsx,js,jsx}']),
  {
    files: ['libs/studio-content-library/**/*.{ts,tsx}'],
    rules: {
      ...strictLibraryRules,
      'no-restricted-imports': restrictedImports([
        {
          group: ['@tanstack/react-query'],
          message: 'This library should not contain tanstack-query or any other data-library',
        },
      ]),
    },
  },
  {
    files: [
      'libs/studio-feature-flags/**/*.{ts,tsx}',
      'libs/studio-guard/**/*.{ts,tsx}',
      'libs/studio-ui-test/**/*.{ts,tsx}',
    ],
    rules: strictLibraryRules,
  },
  {
    files: ['libs/studio-feedback-form/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: ['@tanstack/react-query'],
          message: 'This library should not contain tanstack-query or any other data-library',
        },
      ]),
    },
  },
  {
    files: ['libs/studio-hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: ['@tanstack/react-query'],
          message:
            'In the hook library, backend data should be provided as input values to the hooks that needs them.',
        },
        {
          group: ['app-shared/*', '@altinn/*'],
          message: 'Files in the @studio/hooks package should not depend on app-specific packages.',
        },
        {
          group: ['i18next', 'react-i18next'],
          message:
            'In the hook library, texts should be provided as input arguments to the hooks that needs them.',
        },
      ]),
    },
  },
  {
    files: ['libs/studio-hooks/**/*.test.ts', 'libs/studio-hooks/**/*.test.tsx'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  {
    files: ['libs/studio-icons/**/*.tsx'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['variable', 'function'],
          modifiers: ['exported'],
          format: ['PascalCase'],
          custom: {
            regex: '(\\w+Icon$)|(^SvgTemplate$)',
            match: true,
          },
        },
      ],
    },
  },
  {
    files: ['libs/studio-icons/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: ['app-shared/*', '@altinn/*'],
          message: 'Files in the @studio/icons package should not depend on app-specific packages.',
        },
      ]),
    },
  },
  {
    files: ['libs/studio-icons/**/*.test.tsx'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  {
    files: ['libs/studio-pure-functions/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: ['react'],
          message: 'The @studio/pure-functions package should not depend on React.',
        },
        {
          group: ['app-shared/*', '@altinn/*'],
          message:
            'Files in the @studio/pure-functions package should not depend on app-specific packages.',
        },
      ]),
    },
  },
  {
    files: ['packages/ux-editor/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: ['@altinn/ux-editor-v4'],
          message: 'Do not import from @altinn/ux-editor-v4 in ux-editor.',
        },
      ]),
    },
  },
  {
    files: ['packages/ux-editor-v4/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: ['@altinn/ux-editor'],
          message: 'Do not import from @altinn/ux-editor in ux-editor-v4.',
        },
      ]),
    },
  },
  {
    files: ['packages/policy-editor/**/*.{ts,tsx}', 'packages/process-editor/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  {
    files: ['packages/schema-editor/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'no-restricted-imports': restrictedImports([
        {
          group: ['**/schema-model', '!@altinn/schema-model'],
          message: 'Import from @altinn/schema-model instead of using relative path.',
        },
      ]),
    },
  },
];
