export default [
  {
    ignores: ['src/data/**', 'src/reports/**'],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
      },
    },
    rules: {
      'eol-last': 'error',
      indent: ['warn', 2, { SwitchCase: 1 }],
      quotes: [
        'warn',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: true,
        },
      ],
      semi: ['warn', 'always', { omitLastInOneLineBlock: true }],
    },
  },
];
