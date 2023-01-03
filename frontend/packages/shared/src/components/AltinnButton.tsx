import React from 'react';
import { Button } from '@mui/material';
import classNames from 'classnames';
import classes from './AltinnButton.module.css';

export interface IAltinnButtonComponentProvidedProps {
  /** Button ID */
  id?: any;
  /** Text shown on button */
  btnText: string;
  /** onClick function */
  onClickFunction?: any;
  /** Class objects created with Material-Ui's createStyle */
  className?: any;
  /** Secondary styling */
  secondaryButton?: boolean;
  /** Disabled styling */
  disabled?: boolean;
  /** Button ref */
  btnRef?: React.RefObject<any>;
}

const fontSize = { fontSize: 16 };

const AltinnButton = React.forwardRef(
  (
    {
      id,
      disabled,
      secondaryButton,
      className,
      onClickFunction,
      btnText,
    }: IAltinnButtonComponentProvidedProps,
    ref: any
  ) => (
    <Button
      id={id}
      disabled={disabled}
      variant={secondaryButton === true ? 'text' : 'contained'}
      className={classNames(className, {
        [classes.button]: secondaryButton !== true,
        [classes.secondaryButton]: secondaryButton === true,
      })}
      onClick={onClickFunction}
      style={fontSize}
      ref={ref}
      sx={{
        background: secondaryButton ? 'transparent' : '#0062BA',
      }}
    >
      <span
        className={classNames({
          [classes.borderBottom]: secondaryButton === true && disabled !== true,
          [classes.borderBottomDisabled]: secondaryButton === true && disabled === true,
        })}
      >
        {btnText}
      </span>
    </Button>
  )
);

AltinnButton.displayName = 'AltinnButton';

export default AltinnButton;
