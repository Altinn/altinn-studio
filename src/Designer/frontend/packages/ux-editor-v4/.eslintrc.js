module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@altinn/ux-editor'],
            message: 'Do not import from @altinn/ux-editor in ux-editor-v4.',
          },
        ],
      },
    ],
  },
};
