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
                message: 'This library should not contain tanstack-query or any other data-library',
              },
            ],
          },
        ],
      },
    },
  ],
};
