import React, { useRef } from 'react';

import { HelpText, Radio } from '@digdir/designsystemet-react';
import type { RadioProps } from '@digdir/designsystemet-react';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import classes from 'src/components/form/RadioButton.module.css';
import { DeleteWarningPopover } from 'src/components/molecules/DeleteWarningPopover';
import { useLanguage } from 'src/features/language/useLanguage';
import { useAlertOnChange } from 'src/hooks/useAlertOnChange';

export interface IRadioButtonProps extends Omit<RadioProps, 'children'> {
  showAsCard?: boolean;
  label?: string;
  helpText?: React.ReactNode;
  hideLabel?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  alertOnChange?: boolean;
  alertText?: React.ReactNode;
  confirmChangeText?: string;
}

export const RadioButton = ({
  showAsCard = false,
  label,
  helpText,
  hideLabel,
  onChange,
  alertOnChange,
  alertText,
  confirmChangeText,
  ...rest
}: IRadioButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { elementAsString } = useLanguage();
  const Label = label ? (
    <div className={`${hideLabel ? 'sr-only' : ''} ${classes.radioLabelContainer}`}>
      {label}
      {helpText ? <HelpText title={elementAsString(helpText)}>{helpText}</HelpText> : null}
    </div>
  ) : null;

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange } = useAlertOnChange(
    Boolean(alertOnChange),
    onChange,
  );

  const radioButton = (
    <Radio
      {...rest}
      className={classes.radioButton}
      onChange={handleChange}
      ref={showAsCard ? inputRef : undefined}
    >
      {Label}
    </Radio>
  );
  const cardElement = (
    /** This element is only clickable for visual
         effects. A screen reader would only want to click
         the inner input element of the DesignSystemRadioButton. **/
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
    <div
      className={classes.card}
      data-testid={`test-id-${label}`}
      onClick={() => {
        if (inputRef.current) {
          inputRef.current.click();
        }
      }}
    >
      {radioButton}
    </div>
  );

  return (
    <ConditionalWrapper
      condition={Boolean(alertOnChange)}
      wrapper={(children) => (
        <DeleteWarningPopover
          onPopoverDeleteClick={confirmChange}
          onCancelClick={cancelChange}
          deleteButtonText={confirmChangeText as string}
          messageText={alertText}
          open={alertOpen}
          setOpen={setAlertOpen}
        >
          {children}
        </DeleteWarningPopover>
      )}
    >
      {showAsCard ? cardElement : radioButton}
    </ConditionalWrapper>
  );
};
