import { defineConfig } from 'orval';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  altinnAppApi: {
    input: {
      target: './nextsrc/api/generated/openapi-spec.json',
      override: {
        transformer: './nextsrc/api/openapi-transformer.js',
      },
    },
    output: {
      mode: 'single',
      client: 'axios',
      target: './nextsrc/api/generated/endpoints',
      schemas: './nextsrc/api/generated/model',
      prettier: true,
      override: {
        mutator: {
          path: './nextsrc/api/axios-instance.ts',
          name: 'customAxiosInstance',
        },
      },
    },
  },
});
