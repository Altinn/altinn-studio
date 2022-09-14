export interface SchemaSettings {
  rootNodePath: string;
  definitionsPath: string;
  propertiesPath: string;
}

export enum JsonSchemaDrafts {
  v12 = 'https://json-schema.org/draft/2020-12/schema',
}

export interface SchemaInfo {
  meldingsnavn: string;
  [key: string]: string;
}

export interface SchemaSettingsProps {
  schemaUrl?: string,
  schemaInfo?: SchemaInfo

}


export function getSchemaSettings({
  schemaUrl}
: SchemaSettingsProps): SchemaSettings {
  const settings: SchemaSettings = {
    definitionsPath: '#/definitions',
    propertiesPath: '#/properties',
    rootNodePath: '#/properties',
  };

  if (schemaUrl && schemaUrl === JsonSchemaDrafts.v12) {
    settings.definitionsPath = '#/$defs';
    settings.rootNodePath = '#/oneOf';
  }

  return settings;
}
