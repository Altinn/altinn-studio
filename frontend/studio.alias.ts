import path from 'path';

export default [
  {
    find: '@altinn/policy-editor',
    replacement: path.resolve(__dirname, './packages/policy-editor/src'),
  },
  {
    find: '@altinn/process-editor',
    replacement: path.resolve(__dirname, './packages/process-editor/src'),
  },
  {
    find: '@altinn/schema-editor',
    replacement: path.resolve(__dirname, './packages/schema-editor/src'),
  },
  {
    find: '@altinn/schema-model',
    replacement: path.resolve(__dirname, './packages/schema-model/src'),
  },
  { find: 'app-shared', replacement: path.resolve(__dirname, './packages/shared/src') },
  {
    find: '@altinn/text-editor',
    replacement: path.resolve(__dirname, './packages/text-editor/src'),
  },
  { find: '@altinn/ux-editor', replacement: path.resolve(__dirname, './packages/ux-editor/src') },
  {
    find: '@altinn/ux-editor-v3',
    replacement: path.resolve(__dirname, './packages/ux-editor-v3/src'),
  },
  { find: '@studio/testing', replacement: path.resolve(__dirname, './testing') },
];
