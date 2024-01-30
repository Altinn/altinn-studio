module.exports = {
  overrides: [
    {
      files: ['*.tsx'],
      rules: {
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: ['variable', 'function'],
            modifiers: ['exported'],
            format: ['PascalCase'],
            prefix: ['Studio'],
          },
        ],
      },
    },
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
              // Todo: Add restriction for I18next: https://github.com/Altinn/altinn-studio/issues/12189
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
};
