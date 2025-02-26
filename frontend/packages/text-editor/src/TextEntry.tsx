import React, { useState } from 'react';
import type { TextTableRowEntry } from './types';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { Textarea } from '@digdir/designsystemet-react';
import { Variables } from './Variables';
import { useAutoSizeTextArea } from 'app-shared/hooks/useAutoSizeTextArea';
import { APP_NAME } from 'app-shared/constants';
import { useTranslation } from 'react-i18next';

export interface TextEntryProps extends TextTableRowEntry {
  textId: string;
  upsertTextResource: (data: UpsertTextResourceMutation) => void;
  className?: string;
}

export const TextEntry = ({
  textId,
  lang,
  translation,
  upsertTextResource,
  className,
}: TextEntryProps) => {
  const [textEntryValue, setTextEntryValue] = useState(translation);
  const textareaRef = useAutoSizeTextArea(textEntryValue);
  const { t } = useTranslation();

  const variables = [];

  const getError = (value: string) => {
    if (textId === APP_NAME && value === '') return t('validation_errors.required');
  };

  const handleTextEntryChange = (value: string) => setTextEntryValue(value);

  const handleTextEntryBlur = (value: string) => {
    if (getError(value)) return;
    upsertTextResource({ language: lang, translation: value, textId });
  };

  return (
    <div className={className}>
      <Textarea
        aria-label={t('text_editor.table_row_input_label', {
          lang: t(`language.${lang}`),
          textKey: textId,
        })}
        value={textEntryValue}
        onBlur={(e) => handleTextEntryBlur(e.target.value)}
        onChange={(e) => handleTextEntryChange(e.target.value)}
        ref={textareaRef}
        error={getError(textEntryValue)}
        size='small'
      />
      <Variables variables={variables} />
    </div>
  );
};
