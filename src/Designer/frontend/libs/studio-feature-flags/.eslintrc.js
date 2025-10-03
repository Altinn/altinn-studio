module.exports = {
  overrides: [
    {
      files: ['*.tsx', '*.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
  ],
};
