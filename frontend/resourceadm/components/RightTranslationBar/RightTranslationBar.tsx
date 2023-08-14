import React from 'react';
import classes from './RightTranslationBar.module.css';
import { GlobeIcon } from '@navikt/aksel-icons';
import { TextArea, TextField, Alert, Paragraph, Heading } from '@digdir/design-system-react';
import { LanguageStringType, SupportedLanguageKey } from 'resourceadm/types/global';

interface Props {
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
  onChangeValue: (value: LanguageStringType) => void;
  /**
   * Flag to handle when to show the errors
   */
  showErrors: boolean;
}

/**
 * @component
 * @example
 *    <RightTranslationBar
 *      title='Navn på tjenesten'
 *      value={title}
 *      onChange={(value: LanguageStringType) => setTitle(value)}
 *    />
 *
 * @property {string}[title] - The title of the selected inputfield
 * @property {boolean}[usesTextArea] - Optional Boolean flag to decide if a text area should be used instead of a text field
 * @property {SupportedLanguageKey<string>}[value] - The value to display in the input field
 * @property {(value: LanguageStringType) => void}[onChangeValue] - Function that updates the value when changes are made in the input field.
 * @property {boolean}[showErrors] - Flag to handle when to show the errors
 *
 * @returns
 */
export const RightTranslationBar = ({
  title,
  usesTextArea = false,
  value,
  onChangeValue,
  showErrors,
}: Props) => {
  const handleChange = (lang: 'nn' | 'en', val: string) => {
    const obj: LanguageStringType = lang === 'nn' ? { ...value, nn: val } : { ...value, en: val };
    onChangeValue(obj);
  };
  const displayNField = (lang: 'nn' | 'en') => {
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
        />
      );
    }
    return (
      <TextField
        value={value[lang]}
        onChange={(e) => handleChange(lang, e.target.value)}
        label={label}
        isValid={!(showErrors && value[lang] === '')}
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
        <Alert severity='info' className={classes.alert}>
          <Paragraph size='small'>
            For å kunne publisere ressursen må du legge til nynorsk og engelsk oversettelse.
          </Paragraph>
        </Alert>
        <div className={classes.inputWrapper}>{displayNField('nn')}</div>
        <div className={classes.inputWrapper}>{displayNField('en')}</div>
      </div>
    </div>
  );
};
