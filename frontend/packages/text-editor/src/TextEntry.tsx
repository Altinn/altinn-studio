import React, { useState } from 'react';
import type { TextTableRowEntry, UpsertTextResourceMutation } from './types';
import { Textarea } from '@digdir/design-system-react';
import { Variables } from './Variables';
import { useAutoSizeTextArea } from './hooks/useAutoSizeTextArea';
import { APP_NAME } from 'app-shared/constants';
import { FormField } from '../../shared/src/components/FormField/FormField';
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

  const handleTextEntryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setTextEntryValue(e.currentTarget.value);

  const handleTextEntryBlur = () => {
    if (textEntryValue === '') return;
    upsertTextResource({ language: lang, translation: textEntryValue, textId });
  };

  return (
    <div className={className}>
      <FormField
        value={textId}
        customValidationRules={() => {
          if (textId === APP_NAME && textEntryValue === '') return 'TextSouldNotBeEmpty';
          return '';
        }}
        customValidationMessages={(errorCode: string) => {
          if (errorCode === 'TextSouldNotBeEmpty') return t('validation_errors.required');
        }}
        renderField={({ fieldProps }) => (
          <Textarea
            {...fieldProps}
            aria-label={lang + ' translation'}
            value={textEntryValue}
            onBlur={handleTextEntryBlur}
            onChange={handleTextEntryChange}
            ref={textareaRef}
            size='small'
          />
        )}
      ></FormField>
      <Variables variables={variables} />
    </div>
  );
};
