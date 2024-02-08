import React from 'react';
import { type TextfieldProps, Textfield } from '@digdir/design-system-react';

export type StudioIconTextfieldProps = {
  icon: React.ReactNode;
} & TextfieldProps;

export const StudioIconTextfield = ({ icon, error, ...rest }: StudioIconTextfieldProps) => {
  return (
    // TODO: Fix icon positioning
    <div>
      <div aria-hidden>{icon}</div>
      <Textfield {...rest} error={error} />
    </div>
  );
};
