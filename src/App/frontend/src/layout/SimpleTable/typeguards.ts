import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

import type { FormDataObject, FormDataValue } from 'src/app-components/DynamicForm/DynamicForm';

export function isFormDataValue(value: unknown): value is FormDataValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isFormDataValue);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).every(isFormDataValue);
  }

  return false;
}

export function isFormDataObject(value: unknown): value is FormDataObject {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(isFormDataValue)
  );
}

export function isFormDataObjectArray(value: unknown): value is FormDataObject[] {
  return Array.isArray(value) && value.every((item) => isFormDataObject(item));
}

export function isValidItemsSchema(
  items: unknown,
): items is JSONSchema7 & { properties: { [key: string]: JSONSchema7Definition } } {
  return (
    typeof items === 'object' &&
    items !== null &&
    !Array.isArray(items) &&
    typeof (items as JSONSchema7).properties === 'object' &&
    (items as JSONSchema7).properties !== null &&
    !Array.isArray((items as JSONSchema7).properties)
  );
}
