import React from 'react';

import { ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';

import { WrappedButton } from 'src/components/base/ButtonComponent/WrappedButton';
import type { ButtonProps } from 'src/components/base/ButtonComponent/WrappedButton';

export const SubmitButton = ({ children, ...props }: ButtonProps) => {
  return (
    <WrappedButton
      {...props}
      color={ButtonColor.Success}
      variant={ButtonVariant.Filled}
    >
      {children}
    </WrappedButton>
  );
};
