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
                  'This library should not contain Tanstack query or any other data library.',
              },
              {
                group: ['app-shared/*', '@altinn/*'],
                message: 'This library should not depend on app-specific packages.',
              },
              {
                group: ['i18next', 'react-i18next'],
                message:
                  'The texts for this library should be passed through the configuration object.',
              },
            ],
          },
        ],
      },
    },
  ],
};
