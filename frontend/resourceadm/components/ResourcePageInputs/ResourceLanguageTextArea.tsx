import React, { forwardRef } from 'react';
import classes from './ResourcePageInputs.module.css';
import { Textarea } from '@digdir/design-system-react';

type ResourceLanguageTextAreaProps = {
  label: string;
  description: string;
  value: string;
  onChangeValue: (value: string) => void;
  onFocus: () => void;
  id: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onBlur: () => void;
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
 * @property {React.KeyboardEventHandler<HTMLTextAreaElement>}[onKeyDown] - Function to be executed on key down
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {string}[errorText] - The text to be shown
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceLanguageTextArea = forwardRef<
  HTMLTextAreaElement,
  ResourceLanguageTextAreaProps
>(
  (
    { label, description, value, onChangeValue, onFocus, id, onKeyDown, onBlur, errorText },
    ref,
  ): React.ReactNode => {
    return (
      <>
        <div className={classes.divider} />
        <div className={classes.inputWrapper}>
          <Textarea
            label={label}
            description={description}
            size='small'
            value={value}
            onChange={(e) => onChangeValue(e.currentTarget.value)}
            onFocus={onFocus}
            rows={5}
            id={id}
            error={errorText}
            ref={ref}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
          />
        </div>
      </>
    );
  },
);

ResourceLanguageTextArea.displayName = 'ResourceLanguageTextArea';
