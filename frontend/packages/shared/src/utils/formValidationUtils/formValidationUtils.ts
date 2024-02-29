import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ErrorObject } from 'ajv';

const ajv = new Ajv({
  allErrors: true,
  strict: false,
});

addFormats(ajv);

export const addSchemas = (schemas: any[]) => {
  schemas.forEach((schema) => {
    if (schema) {
      const validate = ajv.getSchema(schema?.$id);
      if (!validate) {
        ajv.addSchema(schema);
      }
    }
  });
};

export const getPropertyByPath = (schema: any, path: string) => {
  return { ...path.split('/').reduce((o, p) => (o || {})[p], schema) };
};

export const isPropertyRequired = (schema: any, propertyPath: string): boolean => {
  if (!schema || !propertyPath) return false;
  const parent = getPropertyByPath(
    schema,
    propertyPath.substring(0, propertyPath.lastIndexOf('/properties')),
  );
  return parent?.required?.includes(propertyPath.split('/').pop());
};

export const validate = (schemaId: string, data: any): ErrorObject[] | null => {
  const ajvValidate = ajv.getSchema(schemaId);
  if (ajvValidate) ajvValidate(data);
  return ajvValidate?.errors;
};

export const validateProperty = (propertyId: string, value: any): string => {
  const ajvValidateErrors = validate(propertyId, value);

  const firstError = ajvValidateErrors?.[0];
  const isCurrentComponentError = firstError?.instancePath === '';
  return isCurrentComponentError ? firstError?.keyword : null;
};

export const getFullyQualifiedComponentSchemaId = (component: string): string => {
  return `https://altinncdn.no/schemas/json/component/${component}.schema.v1.json`;
};

export const getFullyQualifiedSchemaIdFromRef = (ref: string): string => {
  if (!ref) return null;
  if (ref.startsWith('../layout')) {
    return `https://altinncdn.no/schemas/json/${ref.replace('../', '')}`;
  }
  if (ref.startsWith('https://altinncdn.no')) return ref;
  return `https://altinncdn.no/schemas/json/component/${ref}`;
};

export const dereferenceSchema = (schema: any): any => {
  if (!schema) return null;
  if (schema.$ref) {
    const ref = schema.$ref;
    if (ref.includes('layout/expression.schema.v1.json')) {
      return schema;
    }
    const refId = getFullyQualifiedSchemaIdFromRef(ref);
    const refBase = refId.substring(0, ref.indexOf('#'));
    const refPath = refId.substring(ref.indexOf('#') + 1);
    const refName = refPath.substring(refPath.lastIndexOf('/') + 1);
    const refSchema = ajv.getSchema(refBase);
    if (refSchema) {
      return dereferenceSchema(refSchema.schema['definitions'][refName]);
    }
  }
  if (schema.properties) {
    Object.keys(schema.properties).forEach((key) => {
      schema.properties[key] = dereferenceSchema(schema.properties[key]);
    });
  }
  return schema;
};
