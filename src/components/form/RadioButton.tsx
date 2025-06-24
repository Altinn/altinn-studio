import React, { forwardRef, useRef } from 'react';

import { Radio } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { RadioProps } from '@digdir/designsystemet-react';

import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { HelpText } from 'src/app-components/HelpText/HelpText';
import classes from 'src/components/form/RadioButton.module.css';
import { DeleteWarningPopover } from 'src/features/alertOnChange/DeleteWarningPopover';
import { useAlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import { useLanguage } from 'src/features/language/useLanguage';

export interface IRadioButtonProps extends Omit<RadioProps, 'children' | 'aria-label' | 'aria-labelledby'> {
  showAsCard?: boolean;
  helpText?: React.ReactNode;
  hideLabel?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  alertOnChange?: boolean;
  alertText?: React.ReactNode;
  confirmChangeText?: string;
}

export const RadioButton = forwardRef<HTMLInputElement, IRadioButtonProps>(function RadioButton(
  {
    showAsCard = false,
    helpText,
    label,
    hideLabel,
    onChange,
    alertOnChange,
    alertText,
    confirmChangeText,
    className,
    ...rest
  },
  forwardedRef,
) {
  const { elementAsString } = useLanguage();

  const { alertOpen, setAlertOpen, handleChange, confirmChange, cancelChange } = useAlertOnChange(
    Boolean(alertOnChange),
    onChange,
  );

  const internalRef = useRef<HTMLInputElement | null>(null);

  const radioButton = (
    <Radio
      {...rest}
      label={
        <div className={`${hideLabel ? 'sr-only' : ''} ${classes.radioLabelContainer}`}>
          {label}
          {helpText ? <HelpText title={elementAsString(helpText)}>{helpText}</HelpText> : null}
        </div>
      }
      className={cn(classes.radioButton, className)}
      onChange={handleChange}
      ref={(elem) => {
        internalRef.current = elem;
        if (typeof forwardedRef === 'function') {
          forwardedRef(elem);
        } else if (forwardedRef) {
          forwardedRef.current = elem;
        }
      }}
    />
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
        internalRef.current?.click();
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
});
