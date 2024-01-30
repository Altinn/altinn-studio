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
                group: ['app-shared/*', '@altinn/*'],
                message:
                  'Files in the @studio/icons package should not depend on app-specific packages.',
              },
            ],
          },
        ],
      },
    },
  ],
};
