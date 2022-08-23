export interface SchemaSettings {
  rootNodePath: string;
  definitionsPath: string;
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
  schemaUrl,
  schemaInfo}
: SchemaSettingsProps): SchemaSettings {
  if (schemaUrl && schemaUrl === JsonSchemaDrafts.v12) {
    return {
      rootNodePath: '#/oneOf',
      definitionsPath: '#/$defs',
    }
  }

  let rootNodePath = '#/properties';

  if (schemaInfo && schemaInfo.meldingsnavn) {
    rootNodePath = `#/properties`;
  }

  return {
    rootNodePath,
    definitionsPath: '#/definitions',
  }
}
