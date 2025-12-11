import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';

export const useDisplayObjectValues = (valuesToBeSaved?: object) => {
  const componentPropertyLabel = useComponentPropertyLabel();

  if (!valuesToBeSaved) return null;

  const translatedValue = (value: unknown) => {
    const valueStr = String(value);

    const directTranslation = componentPropertyLabel(valueStr);
    if (directTranslation !== valueStr) {
      return directTranslation;
    }

    const enumKey = `enum_${valueStr}`;
    const enumTranslation = componentPropertyLabel(enumKey);
    if (enumTranslation !== enumKey) {
      return enumTranslation;
    }

    return value;
  };

  return Object.values(valuesToBeSaved).map(translatedValue).join(', ');
};
