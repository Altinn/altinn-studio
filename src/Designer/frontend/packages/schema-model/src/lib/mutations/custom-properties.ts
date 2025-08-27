import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { CustomPropertyType } from '../../types';

/**
 * Delete a property.
 * @param properties The object to delete from.
 * @param key The key to delete.
 * @returns A new object without the deleted property.
 */
export const deleteProperty = (properties: KeyValuePairs, key: string): KeyValuePairs => {
  const newProperties = { ...properties };
  delete newProperties[key];
  return newProperties;
};

/**
 * Get the type of a property.
 * @param properties The object to get the property from.
 * @param key The key of the property of interest.
 * @returns The type of the property or CustomPropertyType.Unsupported.
 */
export const propertyType = (properties: KeyValuePairs, key: string): CustomPropertyType => {
  const value = properties[key];
  switch (typeof value) {
    case 'string':
      return CustomPropertyType.String;
    case 'number':
      return CustomPropertyType.Number;
    case 'boolean':
      return CustomPropertyType.Boolean;
    default:
      return CustomPropertyType.Unsupported;
  }
};

/**
 * Set a property to a value.
 * @param properties The object to modify.
 * @param key The key of the property to set.
 * @param value The value to set the property to.
 * @returns A new object with the property set to its new value.
 */
export const setProperty = <T>(
  properties: KeyValuePairs,
  key: string,
  value: T,
): KeyValuePairs => ({
  ...properties,
  [key]: value,
});
