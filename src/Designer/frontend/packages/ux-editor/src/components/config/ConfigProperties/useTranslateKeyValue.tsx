import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor/hooks/useComponentPropertyEnumValue';

type Primitive = string | number | boolean;
type PropertyValue = Primitive | Primitive[] | Record<string, unknown>;

export const useTranslateKeyValue = (propertyValue: PropertyValue) => {
  const componentPropertyValue = useComponentPropertyLabel();
  const componentPropertyEnumValue = useComponentPropertyEnumValue();

  if (propertyValue == null) {
    return undefined;
  }

  const translatedValue = (value: Primitive): string => {
    const valueStr = String(value);

    const directTranslation = componentPropertyValue(valueStr);
    if (directTranslation !== valueStr) return directTranslation;

    const enumTranslation = componentPropertyEnumValue(valueStr);
    if (enumTranslation !== valueStr) return enumTranslation;

    return valueStr;
  };

  const processValue = (value: PropertyValue): string => {
    if (Array.isArray(value)) {
      return value.map(translatedValue).join(', ');
    }

    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([key, val]) => `${translatedValue(key)}: ${translatedValue(val as Primitive)}`)
        .join(', ');
    }

    return translatedValue(value);
  };

  return processValue(propertyValue);
};
