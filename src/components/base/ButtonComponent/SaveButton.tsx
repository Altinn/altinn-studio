import React from 'react';

import { ButtonVariant } from '@altinn/altinn-design-system';

import { WrappedButton } from 'src/components/base/ButtonComponent/WrappedButton';
import type { ButtonProps } from 'src/components/base/ButtonComponent/WrappedButton';

export const SaveButton = ({ children, ...props }: ButtonProps) => {
  return (
    <WrappedButton
      {...props}
      variant={ButtonVariant.Outline}
    >
      {children}
    </WrappedButton>
  );
};
