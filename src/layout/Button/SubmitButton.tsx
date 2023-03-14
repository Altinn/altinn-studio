import React from 'react';

import { ButtonColor, ButtonVariant } from '@digdir/design-system-react';

import { WrappedButton } from 'src/layout/Button/WrappedButton';
import type { ButtonProps } from 'src/layout/Button/WrappedButton';

export const SubmitButton = ({ children, ...props }: ButtonProps) => (
  <WrappedButton
    {...props}
    color={ButtonColor.Success}
    variant={ButtonVariant.Filled}
  >
    {children}
  </WrappedButton>
);
