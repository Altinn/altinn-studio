import React from 'react';

import { ButtonVariant } from '@altinn/altinn-design-system';

import { WrappedButton } from 'src/components/base/ButtonComponent/WrappedButton';
import type { ButtonProps } from 'src/components/base/ButtonComponent/WrappedButton';

export const SubmitButton = ({ children, ...props }: ButtonProps) => {
  return (
    <WrappedButton
      {...props}
      variant={ButtonVariant.Submit}
    >
      {children}
    </WrappedButton>
  );
};
