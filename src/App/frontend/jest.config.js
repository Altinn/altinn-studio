// eslint-disable-next-line @typescript-eslint/no-require-imports
const env = require('dotenv').config();

const enableJestPreview = env.parsed?.JEST_PREVIEW === 'true';

/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  preset: 'ts-jest',
  transform: {
    '\\.(js|ts|tsx)$': ['ts-jest'],
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/test/jestTools/transformFile.js',

    ...(enableJestPreview && {
      '\\.(s?css|less)$': 'jest-preview/transforms/css',
    }),
    ...(!enableJestPreview && {
      '\\.(s?css|less)$': '<rootDir>/src/test/jestTools/transformCss.js',
    }),
  },
  transformIgnorePatterns: ['node_modules/(?!react-leaflet)/'],
  reporters: ['default', 'jest-junit'],
  moduleDirectories: ['<rootDir>', 'node_modules'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^schemas/(.*)$': '<rootDir>/schemas/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testRegex: '\\.test\\.(ts|tsx|js|jsx)$',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  testEnvironmentOptions: {
    url: 'https://local.altinn.cloud/ttd/test',
  },
  testEnvironment: 'jsdom',
  globalSetup: './src/globalSetup.ts',
};

module.exports = config;
