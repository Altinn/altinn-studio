import React, { useRef } from 'react';

import { LegacyRadioButton as DesignSystemRadioButton } from '@digdir/design-system-react';
import type { LegacyRadioButtonProps } from '@digdir/design-system-react';

import classes from 'src/components/form/RadioButton.module.css';

const Card = ({ children }: { children: React.ReactNode }) => <div className={classes.card}>{children}</div>;

export interface IRadioButtonProps extends LegacyRadioButtonProps {
  showAsCard?: boolean;
}

export const RadioButton = ({ showAsCard = false, ...rest }: IRadioButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  if (showAsCard) {
    return (
      <Card>
        {/** This element is only clickable for visual
         effects. A screen reader would only want to click
         the inner input element of the DesignSystemRadioButton. */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
        <div
          className={classes.cardLabel}
          data-testid={`test-id-${rest.label}`}
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.click();
              inputRef.current.focus();
            }
          }}
        />
        <DesignSystemRadioButton
          {...rest}
          ref={inputRef}
        />
      </Card>
    );
  }
  return <DesignSystemRadioButton {...rest} />;
};
