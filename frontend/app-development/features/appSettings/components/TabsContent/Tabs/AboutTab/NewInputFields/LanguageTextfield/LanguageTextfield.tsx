import React, { useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { StudioTextfield } from '@studio/components';
import classes from './LanguageTextfield.module.css';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage, ValidLanguage } from 'app-shared/types/SupportedLanguages';
import { TranslationBox } from './TranslationBox';
import type { AppResourceFormError } from 'app-shared/types/AppResource';

type LanguageTextFieldProps = {
  id: string;
  label: string;
  description?: string;
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
  onFocus: () => void;
  isTextArea?: boolean;
  required?: boolean;
  isTranslationPanelOpen: boolean;
  errors?: AppResourceFormError[];
};

export function LanguageTextField({
  id,
  label,
  description,
  value,
  onChange,
  onFocus,
  isTextArea = false,
  required = false,
  isTranslationPanelOpen,
  errors,
}: LanguageTextFieldProps): ReactElement {
  const { t } = useTranslation();

  const tagText: string = required ? t('general.required') : t('general.optional');

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    language: ValidLanguage,
  ): void => {
    const newLanguage = { ...value, [language]: e.target.value };
    onChange(newLanguage);
  };

  const fieldLabel: string = `${label} (${t('language.nb')})`;

  const mainFieldError = errors
    .filter((error) => error.index === 'nb')
    .map((error, index) => error.error);

  return (
    <div className={classes.languageFieldWrapper}>
      <StudioTextfield
        id={id}
        label={fieldLabel}
        description={description}
        value={value['nb']}
        multiple={isTextArea}
        className={classes.textField}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e, 'nb')}
        onFocus={onFocus}
        required={required}
        tagText={tagText}
        rows={isTextArea ? 5 : undefined}
        error={mainFieldError.length > 0 ? mainFieldError : undefined}
      />
      {isTranslationPanelOpen && (
        <TranslationBox
          label={label}
          isTextArea={isTextArea}
          value={value}
          onChange={onChange}
          required={required}
          tagText={tagText}
          errors={errors}
        />
      )}
    </div>
  );
}

const emptyLanguages: SupportedLanguage = { nb: '', nn: '', en: '' };
