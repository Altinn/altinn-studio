import type { CharacterLimit } from '@digdir/design-system-react/dist/types/utilities/InputWrapper';

import { useLanguage } from 'src/features/language/useLanguage';

/**
 * Hook to create a character limit object for use in input components
 */
export const useCharacterLimit = (maxLength: number | undefined): CharacterLimit | undefined => {
  const { langAsString } = useLanguage();

  if (maxLength === undefined) {
    return undefined;
  }

  return {
    maxCount: maxLength,
    label: (count: number) =>
      count >= 0
        ? langAsString('input_components.remaining_characters', [`${count}`, `${maxLength}`])
        : langAsString('input_components.exceeded_max_limit', [`${Math.abs(count)}`]),

    srLabel: langAsString('input_components.character_limit_sr_label', [`${maxLength}`]),
  };
};
