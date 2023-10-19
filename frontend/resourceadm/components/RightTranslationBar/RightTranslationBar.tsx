import React, { forwardRef } from 'react';
import classes from './RightTranslationBar.module.css';
import { GlobeIcon } from '@navikt/aksel-icons';
import { Textfield, Alert, Paragraph, Heading, Textarea } from '@digdir/design-system-react';
import type { SupportedLanguage } from 'resourceadm/types/global';
import type { SupportedLanguageKey } from 'app-shared/types/ResourceAdm';
import { useTranslation } from 'react-i18next';

export type RightTranslationBarProps = {
  title: string;
  usesTextArea?: boolean;
  value: SupportedLanguageKey<string>;
  onLanguageChange: (value: SupportedLanguage) => void;
  showErrors: boolean;
  onLeaveLastField: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: () => void;
};

/**
 * @component
 * @example
 *    <RightTranslationBar
 *      title='Navn på tjenesten'
 *      value={title}
 *      onChange={(value: LanguageString) => setTitle(value)}
 *      showErrors
 *      showAlert
 *    />
 *
 * @property {string}[title] - The title of the selected inputfield
 * @property {boolean}[usesTextArea] - Optional Boolean flag to decide if a text area should be used instead of a text field
 * @property {SupportedLanguageKey<string>}[value] - The value to display in the input field
 * @property {(value: LanguageString) => void}[onLanguageChange] - Function that updates the value when changes are made in the input field.
 * @property {boolean}[showErrors] - Flag to handle when to show the errors
 * @property {function}[onLeaveLastField] - Function to be executed when leaving the last field in the translation bar
 * @property {function}[onBlur] - Function to be executed on blur
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const RightTranslationBar = forwardRef<
  HTMLTextAreaElement | HTMLInputElement,
  RightTranslationBarProps
>(
  (
    { title, usesTextArea = false, value, onLanguageChange, showErrors, onLeaveLastField, onBlur },
    ref,
  ): React.ReactNode => {
    const { t } = useTranslation();

    const handleChange = (lang: 'nn' | 'en', val: string) => {
      onLanguageChange({ ...value, [lang]: val });
    };

    const handleTabOutOfTranslationBar = (
      e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // TODO - Handle Tab backwards as well. Issue: #10989
        } else {
          e.preventDefault();
          // Tab was pressed without Shift, perform custom behavior (onLeaveLastField)
          onLeaveLastField(e);
        }
      }
    };

    const displayNField = (lang: 'nn' | 'en', isLast: boolean) => {
      const label = `${title} (${lang === 'en' ? t('language.en') : t('language.nn')})`;

      if (usesTextArea) {
        return (
          <Textarea
            value={value[lang]}
            onChange={(e) => handleChange(lang, e.currentTarget.value)}
            rows={5}
            label={label}
            error={showErrors && value[lang] === ''}
            ref={!isLast ? (ref as React.Ref<HTMLTextAreaElement>) : undefined}
            onKeyDown={(e) => (isLast ? handleTabOutOfTranslationBar(e) : undefined)}
            onBlur={onBlur}
            size='small'
          />
        );
      }
      return (
        <Textfield
          value={value[lang]}
          onChange={(e) => handleChange(lang, e.target.value)}
          label={label}
          error={showErrors && value[lang] === ''}
          ref={!isLast ? (ref as React.Ref<HTMLInputElement>) : undefined}
          onKeyDown={(e) => (isLast ? handleTabOutOfTranslationBar(e) : undefined)}
          onBlur={onBlur}
          size='small'
        />
      );
    };

    return (
      <div className={classes.wrapper}>
        <div className={classes.topWrapper}>
          <GlobeIcon
            title={t('resourceadm.right_translation_bar_translation')}
            fontSize='1.5rem'
            className={classes.icon}
          />
          <Heading size='xsmall' level={2} className={classes.topText}>
            {t('resourceadm.right_translation_bar_title')}
          </Heading>
        </div>
        <div className={classes.bodyWrapper}>
          <Alert severity='info'>
            <Paragraph size='small'>{t('resourceadm.right_translation_bar_alert')}</Paragraph>
          </Alert>
          <div className={classes.inputWrapper}>{displayNField('nn', false)}</div>
          <div className={classes.inputWrapper}>{displayNField('en', true)}</div>
        </div>
      </div>
    );
  },
);

RightTranslationBar.displayName = 'RightTranslationBar';
