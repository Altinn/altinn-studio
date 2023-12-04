const path = require('path');

const packagesToTransform = [
  '@?react-leaflet',
  '@react-dnd',
  'bail',
  'decode-.*',
  'dnd-core',
  'is-plain-obj',
  'mdast.*',
  'micromark',
  'micromark-.*',
  'react-dnd',
  'react-dnd-html5-backend',
  'remark-parse',
  'trough',
  'unified',
  'unist-util-stringify-position',
  'vfile',
  'vfile-message',
  'bpmn-js',
  '@bpmn-io',
  'diagram-js',
  'htm',
].join('|');

/** @type {import('jest').Config} */
const config = {
  transform: {
    '\\.(ts|tsx|js)': '@swc/jest',
    [`node_modules(\\\\|/)(${packagesToTransform})(\\\\|/).+\\.(j|t)sx?$`]: '@swc/jest',
  },
  transformIgnorePatterns: [
    `node_modules(\\\\|/)(?!${packagesToTransform})`,
    'frontend/packages/ux-editor/src/testing/schemas/',
  ],
  reporters: ['default', 'jest-junit'],
  moduleNameMapper: {
    // prettier-ignore
    '\\.(jpg|jpeg|png|gif|eot|otf|svg|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': path.join(__dirname, 'testing/mocks/fileMock.js'),
    '\\.(css|less)$': path.join(__dirname, 'testing/mocks/styleMock.js'),
    '^preact(/(.*)|$)': 'preact$1',
    '^app-shared/(.*)': path.join(__dirname, 'packages/shared/src/$1'),
    '^@altinn/schema-editor/(.*)': path.join(__dirname, 'packages/schema-editor/src/$1'),
    '^@altinn/schema-model/(.*)': path.join(__dirname, 'packages/schema-model/src/$1'),
    '^@altinn/ux-editor/(.*)': path.join(__dirname, 'packages/ux-editor/src/$1'),
    '^@altinn/process-editor/(.*)': path.join(__dirname, 'packages/process-editor/src/$1'),
    '^@altinn/policy-editor/(.*)': path.join(__dirname, 'packages/policy-editor/src/$1'),
    '^@studio/components': path.join(__dirname, 'libs/studio-components/src/$1'),
    '^@altinn/icons': path.join(__dirname, 'libs/altinn-icons/src/$1'),
  },
  testRegex: '(\\.(test|spec))\\.(ts|tsx)$',
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [path.join(__dirname, 'testing/setupTests.ts')],
};

if (process.env.CI) {
  config.reporters.push('github-actions');
  config.collectCoverage = true;
  config.coverageReporters = ['lcov'];
}
module.exports = config;
