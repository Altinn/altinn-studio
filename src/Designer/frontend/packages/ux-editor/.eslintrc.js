module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@altinn/ux-editor-v4'],
            message: 'Do not import from @altinn/ux-editor-v4 in ux-editor.',
          },
        ],
      },
    ],
  },
};
