import React from 'react';
import classes from './RightTranslationBar.module.css';
import { QuestionmarkDiamondIcon } from '@navikt/aksel-icons';
import { TextArea, TextField, Heading, Alert } from '@digdir/design-system-react';
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
    const label = lang === 'en' ? 'Engelsk' : 'Nynorsk';
    const placeholder = lang === 'en' ? 'Translation goes here' : 'Omsetjing går her';

    if (usesTextArea) {
      return (
        <TextArea
          value={value[lang]}
          resize='vertical'
          placeholder={placeholder}
          onChange={(e) => handleChange(lang, e.currentTarget.value)}
          rows={5}
          label={label}
          isValid={showErrors && value[lang] !== ''}
        />
      );
    }
    return (
      <TextField
        value={value[lang]}
        onChange={(e) => handleChange(lang, e.target.value)}
        placeholder={placeholder}
        label={label}
        isValid={showErrors && value[lang] !== ''}
      />
    );
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.topWrapper}>
        <QuestionmarkDiamondIcon title='Oversettelse' fontSize='1.5rem' />
        <p className={`${classes.text} ${classes.topText}`}>Oversettelse</p>
      </div>
      <div className={classes.bodyWrapper}>
        <Heading size='xsmall' level={2}>
          {title}
        </Heading>
        <Alert severity='info' className={classes.alert}>
          For å kunne publisere ressursen må du legge til nynorsk og engelsk oversettelse.
        </Alert>
        <div className={classes.inputWrapper}>{displayNField('nn')}</div>
        <div className={classes.inputWrapper}>{displayNField('en')}</div>
      </div>
    </div>
  );
};
