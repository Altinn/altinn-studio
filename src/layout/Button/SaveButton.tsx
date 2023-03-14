import React from 'react';

import { ButtonVariant } from '@digdir/design-system-react';

import { WrappedButton } from 'src/layout/Button/WrappedButton';
import type { ButtonProps } from 'src/layout/Button/WrappedButton';

export const SaveButton = ({ children, ...props }: ButtonProps) => (
  <WrappedButton
    {...props}
    variant={ButtonVariant.Outline}
  >
    {children}
  </WrappedButton>
);
