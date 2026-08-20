import { useMemo } from 'react';
import type { PropertyDefinition } from '@app/layout-contract';
import { getEditablePropertyType, type EditablePropertyType } from '../../../data/componentCatalog';
import { propertyKeysToExcludeFromComponentConfig } from '../../../utils/component';

type ComponentProperties = Readonly<Record<string, PropertyDefinition>>;

const getKeys = (
  properties: ComponentProperties,
  types: EditablePropertyType[],
  excludedProperties: string[],
): string[] =>
  Object.keys(properties).filter(
    (key) =>
      !excludedProperties.includes(key) &&
      !propertyKeysToExcludeFromComponentConfig.includes(key) &&
      types.includes(getEditablePropertyType(properties[key])),
  );

export const usePropertyTypes = (properties: ComponentProperties, customProperties: string[]) => {
  return useMemo(() => {
    const booleanKeys = getKeys(properties, ['boolean'], customProperties);
    const stringKeys = getKeys(properties, ['string'], customProperties);
    const numberKeys = getKeys(properties, ['number', 'integer'], customProperties);
    const arrayKeys = getKeys(properties, ['array'], customProperties);
    const objectKeys = getKeys(properties, ['object'], [...customProperties, 'source']);
    return {
      booleanKeys,
      stringKeys,
      numberKeys,
      arrayKeys,
      objectKeys,
    };
  }, [properties, customProperties]);
};
