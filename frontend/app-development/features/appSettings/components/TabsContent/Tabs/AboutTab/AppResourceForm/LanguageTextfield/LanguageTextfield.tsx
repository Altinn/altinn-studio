import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { StudioTextfield, StudioDetails, StudioCard, StudioTag } from '@studio/components';
import classes from './LanguageTextfield.module.css';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage, ValidLanguage } from 'app-shared/types/SupportedLanguages';
import { TranslationBox } from './TranslationBox';
import type { AppResourceFormError } from 'app-shared/types/AppResource';
import {
  getErrorMessagesForLanguage,
  getTextfieldRows,
} from '../../utils/appResourceLanguageUtils';

type LanguageTextFieldProps = {
  id: string;
  label: string;
  description?: string;
  value: SupportedLanguage;
  updateLanguage: (value: SupportedLanguage) => void;
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
  updateLanguage,
  onFocus,
  isTextArea = false,
  required = false,
  isTranslationPanelOpen,
  errors,
}: LanguageTextFieldProps): ReactElement {
  const { t } = useTranslation();

  const tagText: string = required ? t('general.required') : t('general.optional');
  const fieldLabel: string = `${label} (${t('language.nb')})`;
  const mainFieldError: string[] = getErrorMessagesForLanguage(errors, 'nb');

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    language: ValidLanguage,
  ): void => {
    const newLanguage = { ...value, [language]: e.target.value };
    updateLanguage(newLanguage);
  };

  /*return (
    <div className={classes.languageFieldWrapper}>
      <StudioTextfield
        id={`${id}-nb`}
        label={fieldLabel}
        description={description}
        value={value['nb']}
        multiple={isTextArea}
        className={classes.textField}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e, 'nb')}
        onFocus={onFocus}
        required={required}
        tagText={tagText}
        rows={getTextfieldRows(isTextArea)}
        error={mainFieldError}
      />
      {isTranslationPanelOpen && (
        <TranslationBox
          label={label}
          isTextArea={isTextArea}
          value={value}
          onChange={updateLanguage}
          required={required}
          tagText={tagText}
          errors={errors}
          id={id}
        />
      )}
    </div>
  );*/
  return (
    <div style={{ width: '513px' }}>
      <StudioTextfield
        label={'Navn på appen (Bokmål)'}
        required
        tagText='Må fylles ut'
        style={{ marginBottom: '1rem' }}
      />

      <StudioCard data-color='neutral' style={{ marginBottom: '2rem' }}>
        <StudioDetails>
          <StudioDetails.Summary>
            Oversettelse av Navn på appen
            <StudioTag data-color='warning'>Må fylles ut</StudioTag>
          </StudioDetails.Summary>
          <StudioDetails.Content>
            <StudioTextfield
              label='Navn på appen (Nynorsk)'
              required
              tagText='Må fylles ut'
              style={{ marginBottom: '0.5rem' }}
            />
            <StudioTextfield
              label='Navn på appen (Engelsk)'
              required
              tagText='Må fylles ut'
              style={{ marginBottom: '0.5rem' }}
            />
          </StudioDetails.Content>
        </StudioDetails>
      </StudioCard>
    </div>
  );
}
