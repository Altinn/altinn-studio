import { useMemo } from 'react';

import { useAttachments } from 'src/features/attachments/AttachmentsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useAllOptionsSelector } from 'src/features/options/useAllOptions';
import type { DisplayDataProps } from 'src/features/displayData/index';

export function useDisplayDataProps(): DisplayDataProps {
  const langTools = useLanguage();
  const optionsSelector = useAllOptionsSelector();
  const attachments = useAttachments();
  const currentLanguage = useCurrentLanguage();
  const formDataSelector = FD.useDebouncedSelector();

  return useMemo(
    () => ({ optionsSelector, attachments, langTools, currentLanguage, formDataSelector }),
    [attachments, langTools, optionsSelector, currentLanguage, formDataSelector],
  );
}
