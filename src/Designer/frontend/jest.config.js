const path = require('path');

const packagesToTransform = [
  '@bpmn-io',
  '@?react-leaflet',
  '@react-dnd',
  'bail',
  'bpmn-js',
  'decode-.*',
  'diagram-js',
  'dnd-core',
  'htm',
  'is-plain-obj',
  'mdast.*',
  'micromark',
  'micromark-.*',
  'path-intersection',
  'react-dnd',
  'react-dnd-html5-backend',
  'react-error-boundary',
  'remark-parse',
  'trough',
  'unified',
  'unist-util-stringify-position',
  'uuid',
  'vfile',
  'vfile-message',
].join('|');

// For packages that declare ESM exports but not CJS
const resolveNodeModulesPath = (subPath) => {
  return path.join(__dirname, '../../../node_modules/', subPath);
};

/** @type {import('jest').Config} */
const config = {
  transform: {
    '\\.(ts|tsx|js)': '@swc/jest',
    [`node_modules(\\\\|/)(${packagesToTransform})(\\\\|/).+\\.(j|t)sx?$`]: '@swc/jest',
  },
  transformIgnorePatterns: [
    `node_modules(\\\\|/)(?!${packagesToTransform})`,
    '\\.schema\\.v1\\.json$',
    'nb.json$',
    'en.json$',
  ],
  reporters: ['default', 'jest-junit'],
  moduleNameMapper: {
    // prettier-ignore
    '\\.(jpg|jpeg|png|gif|eot|otf|svg|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': path.join(__dirname, 'testing/mocks/fileMock.js'),
    '\\.(css|less)$': 'identity-obj-proxy',
    // Force react-i18next to resolve to root node_modules to ensure global mock applies for app-development
    '^react-i18next$': require.resolve('react-i18next'),
    '^@bpmn-io/diagram-js-ui$': resolveNodeModulesPath('@bpmn-io/diagram-js-ui/lib/index.js'),
    '^path-intersection$': resolveNodeModulesPath('path-intersection/intersect.js'),
    '^preact(/(.*)|$)': 'preact$1',
    '^@altinn/policy-editor/(.*)': path.join(__dirname, 'packages/policy-editor/src/$1'),
    '^@altinn/process-editor/(.*)': path.join(__dirname, 'packages/process-editor/src/$1'),
    '^@altinn/schema-editor/(.*)': path.join(__dirname, 'packages/schema-editor/src/$1'),
    '^@altinn/schema-model/(.*)': path.join(__dirname, 'packages/schema-model/src/$1'),
    '^app-shared/(.*)': path.join(__dirname, 'packages/shared/src/$1'),
    '^@altinn/text-editor/(.*)': path.join(__dirname, 'packages/text-editor/src/$1'),
    '^@altinn/ux-editor/(.*)': path.join(__dirname, 'packages/ux-editor/src/$1'),
    '^@altinn/ux-editor-v3/(.*)': path.join(__dirname, 'packages/ux-editor-v3/src/$1'),
    '^@studio/guard/(.*)': path.join(__dirname, 'libs/studio-guard/$1'),
    '^@studio/icons/(.*)': path.join(__dirname, 'libs/studio-icons/$1'),
    '^@studio/components/(.*)': path.join(__dirname, 'libs/studio-components/$1'),
    '^@studio/components-legacy/(.*)': path.join(__dirname, 'libs/studio-components-legacy/$1'),
    '^@studio/feature-flags/(.*)': path.join(__dirname, 'libs/studio-feature-flags/$1'),
    '^@studio/hooks/(.*)': path.join(__dirname, 'libs/studio-hooks/$1'),
    '^@studio/pure-functions/(.*)': path.join(__dirname, 'libs/studio-pure-functions/$1'),
    '^@studio/testing/(.*)': path.join(__dirname, 'testing/$1'),
  },
  testRegex: '(\\.(test))\\.(ts|tsx)$',
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [path.join(__dirname, 'testing/setupTests.ts')],
};

if (process.env.CI) {
  config.reporters.push('github-actions');
  config.collectCoverage = true;
  config.coverageReporters = ['lcov'];
  config.coveragePathIgnorePatterns = [
    'frontend/packages/ux-editor/src/testing/',
    'frontend/packages/ux-editor-v3/src/testing/',
    'frontend/scripts/',
  ];
}
module.exports = config;
