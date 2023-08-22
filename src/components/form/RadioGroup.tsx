import React from 'react';

import { LegacyFieldSet } from '@digdir/design-system-react';
import cn from 'classnames';
import type { LegacyRadioButton } from '@digdir/design-system-react';

import classes from 'src/components/form/RadioGroup.module.css';

export interface IRadioGroupProps {
  legend: React.ReactNode;
  description?: React.ReactNode;
  helpText?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactElement<typeof LegacyRadioButton> | React.ReactElement<typeof LegacyRadioButton>[];
  shouldDisplayHorizontally?: boolean;
  disabled?: boolean;
}

export const RadioGroup = ({
  legend,
  description,
  helpText,
  children,
  error,
  shouldDisplayHorizontally,
  disabled = false,
}: IRadioGroupProps) => (
  <LegacyFieldSet
    legend={legend}
    description={description}
    helpText={helpText}
    error={error}
    disabled={disabled}
  >
    <div
      role='radiogroup'
      className={cn(classes.radioGroup)}
      // Implemented with inline styles to be able to test with toHaveStyle
      style={{ flexDirection: shouldDisplayHorizontally ? 'row' : 'column' }}
    >
      {children}
    </div>
  </LegacyFieldSet>
);
