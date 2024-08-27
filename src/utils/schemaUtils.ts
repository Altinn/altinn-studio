import JsonPointer from 'jsonpointer';
import type { JSONSchema7 } from 'json-schema';

import type { IDataType } from 'src/types/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getRootElementPath = (schema: any, dataType: IDataType | undefined): string => {
  if (![null, undefined].includes(schema.info?.rootNode)) {
    // If rootNode is defined in the schema
    return schema.info.rootNode as string;
  }
  if (schema.info?.meldingsnavn && schema.properties) {
    // SERES workaround
    return schema.properties[schema.info.meldingsnavn]?.$ref || '';
  }

  const classRef = dataType?.appLogic?.classRef?.replace('Altinn.App.Models.', '');
  if (classRef && schema.$defs?.[classRef]) {
    return `#/$defs/${classRef}`;
  }
  if (classRef && schema.definitions?.[classRef]) {
    return `#/definitions/${classRef}`;
  }

  return '';
};

/**
 * Gets a json schema part by a schema patch
 * @param schemaPath the path, format #/properties/model/properties/person/properties/name/maxLength
 * @param jsonSchema the json schema to get part from
 * @returns the part, or null if not found
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSchemaPart(schemaPath: string, jsonSchema: JSONSchema7): any {
  try {
    // want to transform path example format to to /properties/model/properties/person/properties/name
    const pointer = schemaPath.substr(1).split('/').slice(0, -1).join('/');
    return JsonPointer.compile(pointer).get(jsonSchema);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Wrapper method around getSchemaPart for schemas made with our old generator tool
 * @param schemaPath the path, format #/properties/model/properties/person/properties/name/maxLength
 * @param mainSchema the main schema to get part from
 * @param rootElementPath the subschema to get part from
 * @returns the part, or null if not found
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSchemaPartOldGenerator(schemaPath: string, mainSchema: object, rootElementPath: string): any {
  // for old generators we can have a ref to a definition that is placed outside of the subSchema we validate against.
  // if we are looking for #/definitons/x we search in main schema

  if (/^#\/(definitions|\$defs)\//.test(schemaPath)) {
    return getSchemaPart(schemaPath, mainSchema);
  }
  // all other in sub schema
  return getSchemaPart(schemaPath, getSchemaPart(`${rootElementPath}/#`, mainSchema));
}

export function processInstancePath(path: string): string {
  let result = path.startsWith('.') ? path.slice(1) : path;
  result = result
    .replace(/"]\["|']\['/g, '.')
    .replace(/\["|\['/g, '')
    .replace(/"]|']/g, '');
  return result;
}
