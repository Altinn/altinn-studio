import React, { useState } from 'react';
import type { TextTableRowEntry } from './types';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { Variables } from './Variables';
import { useAutoSizeTextArea } from 'app-shared/hooks/useAutoSizeTextArea';
import { APP_NAME } from 'app-shared/constants';
import { FormField } from 'app-shared/components/FormField/FormField';
import { useTranslation } from 'react-i18next';
import { StudioTextarea } from 'libs/studio-components-legacy/src';

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
          <StudioTextarea
            {...fieldProps}
            aria-label={t('text_editor.table_row_input_label', {
              lang: t(`language.${lang}`),
              textKey: textId,
            })}
            value={textEntryValue}
            onBlur={handleTextEntryBlur}
            onChange={handleTextEntryChange}
            ref={textareaRef}
          />
        )}
      ></FormField>
      <Variables variables={variables} />
    </div>
  );
};
