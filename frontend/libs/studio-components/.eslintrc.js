module.exports = {
  overrides: [
    {
      files: ['*.tsx', '*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
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
            ],
          },
        ],
      },
    },
    {
      files: ['*.test.tsx'],
      rules: {
        '@typescript-eslint/naming-convention': 'off',
      },
    },
  ],

  extends: ['plugin:storybook/recommended'],
};
