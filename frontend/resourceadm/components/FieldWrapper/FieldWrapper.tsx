import { Label, Paragraph } from '@digdir/design-system-react';
import React from 'react';

interface FieldWrapperProps {
  label: string;
  description?: string;
  children: React.JSX.Element | React.JSX.Element[];
  fieldId?: string;
  ariaDescriptionId?: string;
}

export const FieldWrapper = ({
  label,
  description,
  fieldId,
  ariaDescriptionId,
  children,
}: FieldWrapperProps): React.JSX.Element => {
  return (
    <div>
      <Label size='small' spacing htmlFor={fieldId}>
        {label}
      </Label>
      {description && (
        <Paragraph id={ariaDescriptionId} short size='small'>
          {description}
        </Paragraph>
      )}
      {children}
    </div>
  );
};
