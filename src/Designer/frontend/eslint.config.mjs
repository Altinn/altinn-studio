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

const designsystemetRestriction = {
  group: [
    '@digdir/designsystemet-react',
    '@digdir/designsystemet-react/*',
    '@digdir/designsystemet-css',
    '@digdir/designsystemet-css/**',
  ],
  message:
    'Do not import from Designsystemet directly. Import components from @designer/components instead, and add a wrapper there if the component is missing. The Designsystemet stylesheets are loaded by @designer/components.',
};

const restrictedImportsAllowingDesignsystemet = (patterns) => [
  'error',
  {
    patterns,
  },
];

const restrictedImports = (patterns) =>
  restrictedImportsAllowingDesignsystemet([...patterns, designsystemetRestriction]);

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
            'Use the package name, not the relative path, when importing from a @designer library.',
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
    files: ['libs/designer-components/.storybook/**/*.{ts,tsx}'],
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
    files: ['libs/designer-assistant/**/*.{ts,tsx}'],
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
    files: ['libs/designer-browser-storage/**/*.{ts,tsx}'],
    rules: {
      ...strictLibraryRules,
      'no-restricted-imports': restrictedImports([
        {
          group: ['react'],
          message: 'The @designer/browser-storage package should not depend on React.',
        },
        {
          group: ['app-shared/*', '@altinn/*'],
          message:
            'Files in the @designer/browser-storage package should not depend on app-specific packages.',
        },
      ]),
    },
  },
  {
    files: ['libs/designer-components/**/*.{ts,tsx}'],
    settings: {
      'testing-library/custom-renders': ['rowsToRender'],
    },
    rules: {
      ...strictLibraryRules,
      'no-restricted-imports': restrictedImportsAllowingDesignsystemet([
        {
          group: ['@tanstack/react-query'],
          message:
            'In the components library, backend data should be provided as input values to the functions and components that needs them.',
        },
        {
          group: ['app-shared/*', '@altinn/*'],
          message:
            'Files in the @designer/components package should not depend on app-specific packages.',
        },
        {
          group: ['i18next', 'react-i18next'],
          message:
            'In the components library, texts should be provided as input props to the components that needs them.',
        },
      ]),
    },
  },
  {
    files: ['libs/designer-components/**/*.test.tsx'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  ...storybookConfig(['libs/designer-components/**/*.{stories,story}.{ts,tsx,js,jsx}']),
  {
    files: ['libs/designer-content-library/**/*.{ts,tsx}'],
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
      'libs/designer-feature-flags/**/*.{ts,tsx}',
      'libs/designer-guard/**/*.{ts,tsx}',
      'libs/designer-ui-test/**/*.{ts,tsx}',
    ],
    rules: strictLibraryRules,
  },
  {
    files: ['libs/designer-feedback-form/**/*.{ts,tsx}'],
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
    files: ['libs/designer-hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: ['@tanstack/react-query'],
          message:
            'In the hook library, backend data should be provided as input values to the hooks that needs them.',
        },
        {
          group: ['app-shared/*', '@altinn/*'],
          message:
            'Files in the @designer/hooks package should not depend on app-specific packages.',
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
    files: ['libs/designer-hooks/**/*.test.ts', 'libs/designer-hooks/**/*.test.tsx'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  {
    files: ['libs/designer-icons/**/*.tsx'],
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
    files: ['libs/designer-icons/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: ['app-shared/*', '@altinn/*'],
          message:
            'Files in the @designer/icons package should not depend on app-specific packages.',
        },
      ]),
    },
  },
  {
    files: ['libs/designer-icons/**/*.test.tsx'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  {
    files: ['libs/designer-pure-functions/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: ['react'],
          message: 'The @designer/pure-functions package should not depend on React.',
        },
        {
          group: ['app-shared/*', '@altinn/*'],
          message:
            'Files in the @designer/pure-functions package should not depend on app-specific packages.',
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
    files: ['packages/process-editor/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: ['@altinn/process-editor-v8'],
          message: 'Do not import from @altinn/process-editor-v8 in process-editor.',
        },
      ]),
    },
  },
  {
    files: ['packages/process-editor-v8/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: ['@altinn/process-editor'],
          message: 'Do not import from @altinn/process-editor in process-editor-v8.',
        },
      ]),
    },
  },
  {
    files: [
      'packages/policy-editor/**/*.{ts,tsx}',
      'packages/process-editor/**/*.{ts,tsx}',
      'packages/process-editor-v8/**/*.{ts,tsx}',
    ],
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
