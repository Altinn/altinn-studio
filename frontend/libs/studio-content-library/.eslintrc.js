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
                  'In this library should not contain tanstack-query or any other data-library',
              },
            ],
          },
        ],
      },
    },
  ],
};
