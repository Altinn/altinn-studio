import type { IFormatting } from '@app/layout-contract/generated/common.generated';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { getMapToReactNumberConfig } from 'src/utils/formattingUtils';
import type { ExprResolved } from 'src/features/expressions/types';

export const useMapToReactNumberConfig = (formatting: ExprResolved<IFormatting> | undefined, value = '') => {
  const selectedLanguage = useCurrentLanguage();
  return useMemoDeepEqual(
    () => getMapToReactNumberConfig(formatting, value, selectedLanguage),
    [formatting, value, selectedLanguage],
  );
};
