import React from 'react';

import { WrappedButton } from 'src/layout/Button/WrappedButton';
import type { ButtonProps } from 'src/layout/Button/WrappedButton';

export const SubmitButton = ({ children, ...props }: ButtonProps) => (
  <WrappedButton
    {...props}
    color='success'
    variant='primary'
  >
    {children}
  </WrappedButton>
);
