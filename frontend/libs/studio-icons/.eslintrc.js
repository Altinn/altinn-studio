module.exports = {
  overrides: [
    {
      files: ['*.tsx'],
      rules: {
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: ['variable', 'function'],
            modifiers: ['exported'],
            format: ['PascalCase'],
            custom: {
              regex: '(\\w+Icon$)|(^SvgTemplate$)',
              match: true,
            },
          },
        ],
      },
    },
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
    {
      files: ['*.test.tsx'],
      rules: {
        '@typescript-eslint/naming-convention': 'off',
      },
    },
  ],
};
