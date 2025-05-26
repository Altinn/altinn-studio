import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { StudioAlert, StudioHeading, StudioParagraph, StudioTextfield } from '@studio/components';
import classes from './TranslationBox.module.css';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from 'app-shared/types/SupportedLanguages';
import type { ValidLanguage } from 'app-shared/types/ResourceAdm';
import { GlobeIcon } from '@studio/icons';

type TranslationBoxProps = {
  label: string;
  isTextArea?: boolean;
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
  required?: boolean;
  tagText?: string;
};

export function TranslationBox({
  label,
  isTextArea = false,
  value,
  onChange,
  required = false,
  tagText,
}: TranslationBoxProps): ReactElement {
  const { t } = useTranslation();

  const handleChange = (lang: ValidLanguage, newValue: string): void => {
    onChange({ ...value, [lang]: newValue });
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.translationBox}>
        <div className={classes.headingWrapper}>
          <GlobeIcon className={classes.icon} />
          <StudioHeading data-size='xs' level={4}>
            Oversettelse
          </StudioHeading>
        </div>
        <StudioAlert data-color='info'>
          <StudioParagraph>{t('app_settings.about_tab_translation_box_alert')}</StudioParagraph>
        </StudioAlert>
        <Textfield
          label={label}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            handleChange('nn', e.target.value)
          }
          isTextArea={isTextArea}
          required={required}
          tagText={tagText}
          language='nn'
        />
        <Textfield
          label={label}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            handleChange('en', e.target.value)
          }
          isTextArea={isTextArea}
          required={required}
          tagText={tagText}
          language='en'
        />
      </div>
    </div>
  );
}

type TextfieldProps = {
  label: string;
  value: SupportedLanguage;
  onChange: (value: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isTextArea?: boolean;
  required?: boolean;
  tagText?: string;
  language: ValidLanguage;
};

function Textfield({
  label,
  value,
  onChange,
  isTextArea = false,
  required = false,
  tagText,
  language,
}: TextfieldProps): ReactElement {
  const { t } = useTranslation();

  const languageText: string = mapLanguageKeyToLanguageText(language, t);
  const fieldLabel: string = `${label} (${languageText})`;
  return (
    <StudioTextfield
      label={fieldLabel}
      value={value[language]}
      multiple={isTextArea}
      className={classes.textField}
      onChange={onChange}
      required={required}
      tagText={tagText}
      rows={isTextArea ? 5 : undefined}
    />
  );
}

export const mapLanguageKeyToLanguageText = (
  val: ValidLanguage,
  translationFunction: (key: string) => string,
) => {
  if (val === 'nb') return translationFunction('language.nb');
  if (val === 'nn') return translationFunction('language.nn');
  return translationFunction('language.en');
};
