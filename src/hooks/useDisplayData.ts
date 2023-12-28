import { useMemo } from 'react';

import { useAttachments } from 'src/features/attachments/AttachmentsContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useAllOptions } from 'src/features/options/useAllOptions';
import type { DisplayDataProps } from 'src/layout';

export function useDisplayDataProps(): DisplayDataProps {
  const langTools = useLanguage();
  const options = useAllOptions();
  const attachments = useAttachments();
  const currentLanguage = useCurrentLanguage();

  return useMemo(
    () => ({ options, attachments, langTools, currentLanguage }),
    [attachments, langTools, options, currentLanguage],
  );
}
