import { useMemo } from 'react';
import {
  PropertyTypes,
  getSupportedPropertyKeysForPropertyType,
  propertyKeysToExcludeFromComponentConfig,
} from '../../../utils/component';

export const usePropertyTypes = (schema, customProperties) => {
  const allPropertyKeys = Object.keys(schema?.properties || {});

  return useMemo(() => {
    const properties = schema?.properties || {};
    const booleanKeys = getSupportedPropertyKeysForPropertyType(
      properties,
      [PropertyTypes.boolean],
      customProperties,
    );

    const stringKeys = getSupportedPropertyKeysForPropertyType(
      properties,
      [PropertyTypes.string],
      customProperties,
    );

    const numberKeys = getSupportedPropertyKeysForPropertyType(
      properties,
      [PropertyTypes.number, PropertyTypes.integer],
      customProperties,
    );

    const arrayKeys = getSupportedPropertyKeysForPropertyType(
      properties,
      [PropertyTypes.array],
      customProperties,
    );

    const objectKeys = getSupportedPropertyKeysForPropertyType(
      properties,
      [PropertyTypes.object],
      [...customProperties, 'source'],
    );

    const supportedKeys = [
      ...booleanKeys,
      ...stringKeys,
      ...numberKeys,
      ...arrayKeys,
      ...objectKeys,
      ...customProperties,
    ];

    const unsupportedKeys = allPropertyKeys.filter(
      (key) =>
        !supportedKeys.includes(key) && !propertyKeysToExcludeFromComponentConfig.includes(key),
    );

    return {
      booleanKeys,
      stringKeys,
      numberKeys,
      arrayKeys,
      objectKeys,
      unsupportedKeys,
    };
  }, [schema?.properties, customProperties, allPropertyKeys]);
};
