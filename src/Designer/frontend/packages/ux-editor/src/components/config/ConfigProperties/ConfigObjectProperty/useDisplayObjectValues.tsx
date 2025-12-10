import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';

export const useDisplayObjectValues = (valuesToBeSaved?: object) => {
  const componentPropertyLabel = useComponentPropertyLabel();

  if (!valuesToBeSaved) return null;

  return Object.values(valuesToBeSaved)
    .map((value) => {
      const translatedValue = componentPropertyLabel(`${value}`);

      if (translatedValue !== value) {
        return translatedValue;
      }

      const translatedEnumValue = componentPropertyLabel(`enum_${value}`);
      if (translatedEnumValue !== `enum_${value}`) {
        return translatedEnumValue;
      }
      return value;
    })
    .join(', ');
};
