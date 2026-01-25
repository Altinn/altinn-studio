import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';

export const useDisplayObjectValues = (valuesToBeSaved?: object) => {
  const componentPropertyLabel = useComponentPropertyLabel();

  if (!valuesToBeSaved) return null;

  const translateEnumValue = (enumValue: string) => {
    const enumKey = `enum_${enumValue}`;
    const translation = componentPropertyLabel(enumKey);
    return translation !== enumKey ? translation : enumValue;
  };

  const translatedValue = (value: unknown) => {
    const valueStr = String(value);

    const directTranslation = componentPropertyLabel(valueStr);
    if (directTranslation !== valueStr) {
      return directTranslation;
    }

    return valueStr
      .split(',')
      .map((enumValue) => enumValue.trim())
      .map(translateEnumValue)
      .join(', ');
  };

  return Object.values(valuesToBeSaved).map(translatedValue).join(', ');
};
