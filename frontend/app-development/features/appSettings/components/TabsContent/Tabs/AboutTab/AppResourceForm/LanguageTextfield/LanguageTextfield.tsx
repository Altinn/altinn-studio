import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { StudioTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage, ValidLanguage } from 'app-shared/types/SupportedLanguages';
import { TranslationDetails } from './TranslationDetails';
import type { AppResourceFormError } from 'app-shared/types/AppResource';
import {
  getErrorMessagesForLanguage,
  getTextfieldRows,
} from '../../utils/appResourceLanguageUtils';

export type LanguageTextfieldProps = {
  id: string;
  label: string;
  description?: string;
  value: SupportedLanguage;
  updateLanguage: (value: SupportedLanguage) => void;
  isTextArea?: boolean;
  required?: boolean;
  errors?: AppResourceFormError[];
};

export function LanguageTextfield({
  id,
  label,
  description,
  value,
  updateLanguage,
  isTextArea = false,
  required = false,
  errors,
}: LanguageTextfieldProps): ReactElement {
  const { t } = useTranslation();

  const tagText: string = required ? t('general.required') : t('general.optional');
  const fieldLabel: string = `${label} (${t('language.nb')})`;
  const mainFieldError: string[] | undefined = getErrorMessagesForLanguage(errors, 'nb');

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    language: ValidLanguage,
  ): void => {
    const newLanguage = { ...value, [language]: e.target.value };
    updateLanguage(newLanguage);
  };

  return (
    <div>
      <StudioTextfield
        id={`${id}-nb`}
        label={fieldLabel}
        description={description}
        value={value['nb']}
        multiple={isTextArea}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e, 'nb')}
        required={required}
        tagText={tagText}
        rows={getTextfieldRows(isTextArea)}
        error={mainFieldError}
      />
      <TranslationDetails
        label={label}
        isTextArea={isTextArea}
        value={value}
        onChange={updateLanguage}
        required={required}
        tagText={tagText}
        errors={errors ?? []}
        id={id}
      />
    </div>
  );
}
