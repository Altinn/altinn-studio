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
