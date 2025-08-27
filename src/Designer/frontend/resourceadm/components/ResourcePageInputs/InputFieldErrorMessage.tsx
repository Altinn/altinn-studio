import { StudioErrorMessage } from 'libs/studio-components-legacy/src';
import classes from './ResourcePageInputs.module.css';
import React from 'react';

type InputFieldErrorMessageProps = {
  /**
   * The error message
   */
  message: string;
};

/**
 * @component
 *    Displays the error message on a text field
 *
 * @property {string}[message] - The error message
 *
 * @returns {React.JSX.Element}
 */
export const InputFieldErrorMessage = ({
  message,
}: InputFieldErrorMessageProps): React.JSX.Element => {
  return (
    <div className={classes.warningCardWrapper}>
      <StudioErrorMessage size='sm'>{message}</StudioErrorMessage>
    </div>
  );
};
