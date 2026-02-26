import React, { useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { StudioParagraph, StudioTag, StudioTabs, StudioTextfield } from '@studio/components';
import { XMarkOctagonFillIcon } from '@studio/icons';
import type { SupportedLanguage, ValidLanguage } from 'app-shared/types/SupportedLanguages';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import { getErrorMessagesForLanguage } from '../../utils/appConfigLanguageUtils';
import classes from './InputfieldsWithTranslation.module.css';

const LANGUAGES: ValidLanguage[] = ['nb', 'nn', 'en'];

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLanguage, setSelectedLanguage] = useState<ValidLanguage>('nb');

  const focusParam = searchParams.get('focus') ?? '';
  const hashPrefix = `${id}-`;
  const languageFromFocus =
    focusParam.startsWith(hashPrefix) &&
    LANGUAGES.includes(focusParam.replace(hashPrefix, '') as ValidLanguage)
      ? (focusParam.replace(hashPrefix, '') as ValidLanguage)
      : undefined;
  const activeLanguage = languageFromFocus ?? selectedLanguage;

  const tagText: string = required ? t('general.required') : t('general.optional');

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    language: ValidLanguage,
  ): void => {
    const newLanguage = { ...value, [language]: e.target.value };
    updateLanguage(newLanguage);
  };

  const handleTabChange = (newValue: string): void => {
    setSelectedLanguage(newValue as ValidLanguage);
    const next = new URLSearchParams(searchParams);
    next.delete('focus');
    setSearchParams(next);
  };

  const languageTabs = LANGUAGES.map((language) => {
    const languageText = t(`language.${language}`);
    const languageHasError = errors.some((err) => err.index === language);

    return (
      <StudioTabs.Tab key={language} value={language} aria-label={`${languageText} ${label}`}>
        <span className={classes.tabLabel}>
          {languageHasError && (
            <XMarkOctagonFillIcon className={classes.tabErrorIcon} aria-hidden />
          )}
          {languageText}
        </span>
      </StudioTabs.Tab>
    );
  });

  const languagePanels = LANGUAGES.map((language) => {
    const currentError = getErrorMessagesForLanguage(errors, language);
    const errorMessage = currentError?.[0];
    const isFocusTarget = focusParam === `${id}-${language}`;
    const textFieldKey = isFocusTarget ? `${id}-${language}-focused` : `${id}-${language}`;
    const ariaLabel = `${label} (${t(`language.${language}`)})`;
    const handleOnChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      handleChange(e, language);
    };

    return (
      <StudioTabs.Panel key={language} value={language}>
        {isTextArea ? (
          <StudioTextfield
            key={textFieldKey}
            id={`${id}-${language}`}
            value={value[language] ?? ''}
            onChange={handleOnChange}
            error={errorMessage}
            multiline
            autoFocus={isFocusTarget}
            aria-label={ariaLabel}
          />
        ) : (
          <StudioTextfield
            key={textFieldKey}
            id={`${id}-${language}`}
            value={value[language] ?? ''}
            onChange={handleOnChange}
            error={errorMessage}
            autoFocus={isFocusTarget}
            aria-label={ariaLabel}
          />
        )}
      </StudioTabs.Panel>
    );
  });

  return (
    <div className={classes.section}>
      <div className={classes.header}>
        <div className={classes.headerTitle}>
          <StudioParagraph className={classes.headerLabel}>{label}</StudioParagraph>
          {description && (
            <StudioParagraph className={classes.headerDescription}>{description}</StudioParagraph>
          )}
        </div>
        <StudioTag data-color={required ? 'warning' : 'info'}>{tagText}</StudioTag>
      </div>
      <StudioTabs value={activeLanguage} onChange={handleTabChange}>
        <StudioTabs.List>{languageTabs}</StudioTabs.List>
        {languagePanels}
      </StudioTabs>
    </div>
  );
}
