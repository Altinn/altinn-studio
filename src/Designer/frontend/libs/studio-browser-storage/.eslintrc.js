module.exports = {
  overrides: [
    {
      files: ['*.tsx', '*.ts'],
      excludedFiles: ['*.test.ts', '*.test.tsx'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['react'],
                message: 'The @studio/browser-storage package should not depend on React.',
              },
              {
                group: ['app-shared/*', '@altinn/*'],
                message:
                  'Files in the @studio/browser-storage package should not depend on app-specific packages.',
              },
            ],
          },
        ],
      },
    },
  ],
};
