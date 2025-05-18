import { useMemo } from 'react';
import {
  PropertyTypes,
  getSupportedPropertyKeysForPropertyType,
  propertyKeysToExcludeFromComponentConfig,
} from '../../../utils/component';

export const usePropertyTypes = (schema, customProperties) => {
  const allPropertyKeys = Object.keys(schema.properties || {});

  return useMemo(() => {
    const booleanKeys = getSupportedPropertyKeysForPropertyType(
      schema.properties,
      [PropertyTypes.boolean],
      customProperties,
    );

    const stringKeys = getSupportedPropertyKeysForPropertyType(
      schema.properties,
      [PropertyTypes.string],
      customProperties,
    );

    const numberKeys = getSupportedPropertyKeysForPropertyType(
      schema.properties,
      [PropertyTypes.number, PropertyTypes.integer],
      customProperties,
    );

    const arrayKeys = getSupportedPropertyKeysForPropertyType(
      schema.properties,
      [PropertyTypes.array],
      customProperties,
    );

    const objectKeys = getSupportedPropertyKeysForPropertyType(
      schema.properties,
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

    const unSupportedKeys = allPropertyKeys.filter(
      (key) =>
        !supportedKeys.includes(key) && !propertyKeysToExcludeFromComponentConfig.includes(key),
    );

    return {
      booleanKeys,
      stringKeys,
      numberKeys,
      arrayKeys,
      objectKeys,
      unSupportedKeys,
    };
  }, [schema.properties, customProperties, allPropertyKeys]);
};
