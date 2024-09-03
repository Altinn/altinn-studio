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
                  'In the hook library, backend data should be provided as input values to the hooks that needs them.',
              },
              {
                group: ['app-shared/*', '@altinn/*'],
                message:
                  'Files in the @studio/hooks package should not depend on app-specific packages.',
              },
              {
                group: ['i18next', 'react-i18next'],
                message:
                  'In the hook library, texts should be provided as input arguments to the hooks that needs them.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['*.test.ts', '*.test.tsx'],
      rules: {
        '@typescript-eslint/naming-convention': 'off',
      },
    },
  ],
};
