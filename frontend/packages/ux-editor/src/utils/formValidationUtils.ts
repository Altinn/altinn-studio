
import Ajv from "ajv";
import addFormats from "ajv-formats"
import type { ErrorObject } from "ajv";

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

export const isPropertyRequired = (schema: any, propertyPath: string) : boolean => {
  if (!schema || !propertyPath) return false;
  const parent = getPropertyByPath(schema, propertyPath.substring(0, propertyPath.lastIndexOf('/properties')));
  return parent?.required?.includes(propertyPath.split('/').pop());
};

export const validate = (schemaId: string, data: any) : ErrorObject[] | null => {
  const ajvValidate = ajv.getSchema(schemaId);
  if (ajvValidate) ajvValidate(data);
  return ajvValidate?.errors;
};

export const validateProperty = (propertyId: string, value: any) :  string => {
  const ajvValidateErrors = validate(propertyId, value);

  const firstError = ajvValidateErrors?.[0];
  const isCurrentComponentError = firstError?.instancePath === '';
  return isCurrentComponentError ? firstError?.keyword : null;
};
