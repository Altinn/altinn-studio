import type { FieldCounterProps } from '@digdir/designsystemet-react';

import { useLanguage } from 'src/features/language/useLanguage';

/**
 * Hook to create a character limit object for use in input components
 */
export const useCharacterLimit = (maxLength: number | undefined): FieldCounterProps | undefined => {
  const { langAsString } = useLanguage();

  if (maxLength === undefined) {
    return undefined;
  }

  return {
    limit: maxLength,
    under: langAsString('input_components.remaining_characters'),
    over: langAsString('input_components.exceeded_max_limit'),
  };
};
