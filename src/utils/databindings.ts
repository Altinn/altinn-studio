import { dot, object } from 'dot-object';

import type { IFormData } from 'src/features/formData';
import type { IMapping } from 'src/layout/common.generated';
import type { IDataModelBindings } from 'src/layout/layout';

/**
 * Converts the formdata in store (that is flat) to a JSON
 * object that matches the JSON datamodel defined by the service from
 * XSD. This is needed for the API to understand
 *
 * The opposite conversion:
 * @see flattenObject
 */
export function convertDataBindingToModel(formData: any): any {
  return object({ ...formData });
}

export function filterOutInvalidData({ data, invalidKeys = [] }: { data: IFormData; invalidKeys: string[] }) {
  if (!invalidKeys) {
    return data;
  }

  const result = {};
  Object.keys(data).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key) && !invalidKeys.includes(key)) {
      result[key] = data[key];
    }
  });

  return result;
}

export const GLOBAL_INDEX_KEY_INDICATOR_REGEX = /\[{\d+}]/g;

export function getKeyWithoutIndex(keyWithIndex: string): string {
  if (keyWithIndex?.indexOf('[') === -1) {
    return keyWithIndex;
  }

  return getKeyWithoutIndex(
    keyWithIndex.substring(0, keyWithIndex.indexOf('[')) + keyWithIndex.substring(keyWithIndex.indexOf(']') + 1),
  );
}

export function getBaseDataModelBindings(dataModelBindings: IDataModelBindings): IDataModelBindings {
  if (typeof dataModelBindings === 'undefined') {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(dataModelBindings).map(([bindingKey, field]) => [bindingKey, getKeyWithoutIndex(field)]),
  );
}

export function getKeyWithoutIndexIndicators(keyWithIndexIndicators: string): string {
  return keyWithIndexIndicators.replaceAll(GLOBAL_INDEX_KEY_INDICATOR_REGEX, '');
}

/**
 * Returns key indexes:
 *
 * MyForm.Group[0].SubGroup[1]
 *              ^           ^
 *
 * as an array => [0, 1]
 */
export function getKeyIndex(keyWithIndex: string): number[] {
  const match = keyWithIndex.match(/\[\d+]/g) || [];
  return match.map((n) => parseInt(n.replace('[', '').replace(']', ''), 10));
}

/**
 * Converts JSON to the flat datamodel used in Redux data store
 * @param data The form data as JSON
 *
 * The opposite conversion:
 * @see convertDataBindingToModel
 */
export function flattenObject(data: any): IFormData {
  const flat = dot(data);

  for (const key of Object.keys(flat)) {
    if (flat[key] === null || (Array.isArray(flat[key]) && flat[key].length === 0)) {
      delete flat[key];
    } else if (flat[key] === '' && key.indexOf('.') > 0) {
      // For backwards compatibility, delete keys inside deeper object that are empty strings. This behaviour is
      // not always consistent, as it is only a case for deeper object (not direct properties).
      delete flat[key];
    } else if (typeof flat[key] === 'object' && !Array.isArray(flat[key]) && Object.keys(flat[key]).length === 0) {
      // Empty objects are not considered
      delete flat[key];
    } else {
      // Cast all values to strings, for backwards compatibility. Lots of code already written in frontend
      // expects data to be formatted as strings everywhere, and since this is a web application, even numeric
      // inputs have their values stored as strings.
      flat[key] = flat[key].toString();
    }
  }

  return flat;
}

/**
 * @deprecated Use (or implement) this via FD.useMapping() instead
 */
export function mapFormData(formData: IFormData, mapping: IMapping | undefined) {
  const mappedFormData = {};
  if (!formData) {
    return mappedFormData;
  }

  if (!mapping) {
    return formData;
  }

  Object.keys(mapping).forEach((source: string) => {
    const target: string = mapping[source];
    mappedFormData[target] = formData[source];
  });
  return mappedFormData;
}
