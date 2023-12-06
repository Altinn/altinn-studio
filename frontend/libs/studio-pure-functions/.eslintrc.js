module.exports = {
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: ['variable', 'function'],
            modifiers: ['exported'],
            format: ['PascalCase'],
            prefix: ['studio'],
          },
        ],
      },
    },
    {
      files: ['*.test.ts'],
      rules: {
        '@typescript-eslint/naming-convention': 'off',
      },
    },
  ],
};
