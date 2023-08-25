import React, { forwardRef } from 'react';
import classes from './RightTranslationBar.module.css';
import { GlobeIcon } from '@navikt/aksel-icons';
import { TextArea, TextField, Alert, Paragraph, Heading } from '@digdir/design-system-react';
import type { SupportedLanguage } from 'resourceadm/types/global';
import type { SupportedLanguageKey } from 'app-shared/types/ResourceAdm';

type RightTranslationBarProps = {
  /**
   * The title of the selected inputfield
   */
  title: string;
  /**
   * Optional Boolean flag to decide if a text area should be used instead of a text field
   */
  usesTextArea?: boolean;
  /**
   * The value to display in the input field
   */
  value: SupportedLanguageKey<string>;
  /**
   * Function that updates the value when changes are made in the input field.
   * @param value The language object
   */
  onLanguageChange: (value: SupportedLanguage) => void;
  /**
   * Flag to handle when to show the errors
   */
  showErrors: boolean;
  /**
   * Function to be executed when leaving the last field in the translation bar
   *
   * @param e the keyboard event
   * @returns void
   */
  onLeaveLastField: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /**
   * Function to be executed on blur
   * @returns
   */
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
    ref
  ): React.ReactNode => {
    const handleChange = (lang: 'nn' | 'en', val: string) => {
      onLanguageChange({ ...value, [lang]: val });
    };

    const handleTabOutOfTranslationBar = (
      e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        onLeaveLastField(e);
      }
    };

    const displayNField = (lang: 'nn' | 'en', isLast: boolean) => {
      const label = `${title} (${lang === 'en' ? 'Engelsk' : 'Nynorsk'})`;

      if (usesTextArea) {
        return (
          <TextArea
            value={value[lang]}
            resize='vertical'
            onChange={(e) => handleChange(lang, e.currentTarget.value)}
            rows={5}
            label={label}
            isValid={!(showErrors && value[lang] === '')}
            ref={!isLast ? (ref as React.Ref<HTMLTextAreaElement>) : undefined}
            onKeyDown={isLast ? handleTabOutOfTranslationBar : undefined}
            onBlur={onBlur}
          />
        );
      }
      return (
        <TextField
          value={value[lang]}
          onChange={(e) => handleChange(lang, e.target.value)}
          label={label}
          isValid={!(showErrors && value[lang] === '')}
          ref={!isLast ? (ref as React.Ref<HTMLInputElement>) : undefined}
          onKeyDown={isLast ? handleTabOutOfTranslationBar : undefined}
          onBlur={onBlur}
        />
      );
    };

    return (
      <div className={classes.wrapper}>
        <div className={classes.topWrapper}>
          <GlobeIcon title='Oversettelse' fontSize='1.5rem' className={classes.icon} />
          <Heading size='xsmall' level={2} className={classes.topText}>
            Oversettelse
          </Heading>
        </div>
        <div className={classes.bodyWrapper}>
          <Alert severity='info'>
            <Paragraph size='small'>
              For å kunne publisere ressursen må du legge til nynorsk og engelsk oversettelse.
            </Paragraph>
          </Alert>
          <div className={classes.inputWrapper}>{displayNField('nn', false)}</div>
          <div className={classes.inputWrapper}>{displayNField('en', true)}</div>
        </div>
      </div>
    );
  }
);

RightTranslationBar.displayName = 'RightTranslationBar';
