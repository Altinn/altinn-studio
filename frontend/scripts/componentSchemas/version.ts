export const versionSettings = {
  v3: {
    layoutSchemaUrl: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
    expressionSchemaUrl: 'https://altinncdn.no/schemas/json/layout/expression.schema.v1.json',
    componentSchemaPath: '@altinn/ux-editor-v3/testing/schemas/json/component',
  },
  v4: {
    layoutSchemaUrl:
      'https://altinncdn.no/toolkits/altinn-app-frontend/4.0.0-rc2/schemas/json/layout/layout.schema.v1.json',
    expressionSchemaUrl:
      'https://altinncdn.no/toolkits/altinn-app-frontend/4.0.0-rc2/schemas/json/layout/expression.schema.v1.json',
    componentSchemaPath: 'altinn/ux-editor/testing/schemas/json/component',
  },
};
export const isValidVersion = (version: string) =>
  validVersions.includes(version as AppFrontendVersion);
export const validVersions = ['v3', 'v4'] as const;
export type AppFrontendVersion = (typeof validVersions)[number];
