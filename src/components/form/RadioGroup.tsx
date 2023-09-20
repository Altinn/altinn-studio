import React from 'react';

import { HelpText, Radio } from '@digdir/design-system-react';

export interface IRadioGroupProps {
  legend: React.ReactNode;
  description?: React.ReactNode;
  helpText?: string;
  error?: React.ReactNode;
  children: React.ReactElement<typeof Radio> | React.ReactElement<typeof Radio>[];
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
  <Radio.Group
    legend={
      <>
        {legend}
        {helpText ? <HelpText title={helpText}>{helpText}</HelpText> : null}
      </>
    }
    description={description}
    error={error}
    disabled={disabled}
    inline={shouldDisplayHorizontally}
    role='radiogroup'
  >
    {children}
  </Radio.Group>
);
