import { useMemo } from 'react';
import { PropertyTypes, getSupportedPropertyKeysForPropertyType } from '../../../utils/component';

export const usePropertyTypes = (schema, customProperties) => {
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
    return {
      booleanKeys,
      stringKeys,
      numberKeys,
      arrayKeys,
      objectKeys,
    };
  }, [schema?.properties, customProperties]);
};
