import React, { Ref } from 'react';
import classes from './AboutResourcePageInputs.module.css';
import { ErrorMessage, Paragraph, Label, TextArea } from '@digdir/design-system-react';

type ResourceLanguageTextAreaProps = {
  /**
   * The label of the text field
   */
  label: string;
  /**
   * The description of the text field
   */
  description: string;
  /**
   * The value in the field
   */
  value: string;
  /**
   * Function that updates the value in the field
   * @param value the new value
   * @returns void
   */
  onChangeValue: (value: string) => void;
  /**
   * Function to be executed when the field is focused
   * @returns void
   */
  onFocus: () => void;
  /**
   * The id of the field
   */
  id: string;
  /**
   * Flag for if the value is valid
   */
  isValid: boolean;
  /**
   * ref of the field
   */
  ref?: Ref<HTMLTextAreaElement>;
  /**
   * Function to be executed on key down
   */
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  /**
   * Function to be executed on blur
   * @returns void
   */
  onBlur: () => void;
  /**
   * Flag for if the error message should be shown
   */
  showErrorMessage?: boolean;
  /**
   * The text to be shown
   */
  errorText?: string;
};

/**
 * @component
 *    Displays an textarea field for a resource variable that has language support.
 *
 * @property {string}[label] - The label of the text field
 * @property {string}[description] - The description of the text field
 * @property {string}[value] - The value in the field
 * @property {function}[onChangeValue] - Function that updates the value in the field
 * @property {function}[onFocus] - unction to be executed when the field is focused
 * @property {string}[id] - The id of the field
 * @property {boolean}[isValid] - Flag for if the value is valid
 * @property {Ref<HTMLInputElement>}[ref] - ref of the field
 * @property {React.KeyboardEventHandler<HTMLInputElement>}[onKeyDown] - Function to be executed on key down
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {boolean}[showErrorMessage] - Flag for if the error message should be shown
 * @property {string}[errorText] - The text to be shown
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceLanguageTextArea = ({
  label,
  description,
  value,
  onChangeValue,
  onFocus,
  id,
  isValid,
  ref,
  onKeyDown,
  onBlur,
  showErrorMessage = false,
  errorText,
}: ResourceLanguageTextAreaProps): React.ReactNode => {
  return (
    <>
      <div className={classes.divider} />
      <Label size='medium' spacing htmlFor={id}>
        {label}
      </Label>
      <Paragraph size='small'>{description}</Paragraph>
      <div className={classes.inputWrapper}>
        <TextArea
          value={value}
          resize='vertical'
          onChange={(e) => onChangeValue(e.currentTarget.value)}
          onFocus={onFocus}
          rows={5}
          id={id}
          isValid={isValid}
          ref={ref}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
        {showErrorMessage && (
          <div className={classes.warningCardWrapper}>
            <ErrorMessage size='small'>{errorText}</ErrorMessage>
          </div>
        )}
      </div>
    </>
  );
};
