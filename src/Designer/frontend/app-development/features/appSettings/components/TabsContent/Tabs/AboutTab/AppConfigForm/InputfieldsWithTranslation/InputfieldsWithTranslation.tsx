import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage, ValidLanguage } from 'app-shared/types/SupportedLanguages';
import { TranslationDetails } from './TranslationDetails';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import { getErrorMessagesForLanguage } from '../../utils/appConfigLanguageUtils';
import { LanguageInputField } from './LanguageInputField';

export type InputfieldsWithTranslationProps = {
  id: string;
  label: string;
  description?: string;
  value?: SupportedLanguage;
  updateLanguage: (value: SupportedLanguage) => void;
  isTextArea?: boolean;
  required?: boolean;
  errors?: AppConfigFormError[];
};

export function InputfieldsWithTranslation({
  id,
  label,
  description = '',
  value = { nb: '', nn: '', en: '' },
  updateLanguage,
  isTextArea = false,
  required = false,
  errors = [],
}: InputfieldsWithTranslationProps): ReactElement {
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
      <LanguageInputField
        id={`${id}-nb`}
        label={fieldLabel}
        description={description}
        value={value['nb']}
        isTextArea={isTextArea}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e, 'nb')}
        required={required}
        tagText={tagText}
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
