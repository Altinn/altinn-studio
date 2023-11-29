import { Label, Paragraph } from '@digdir/design-system-react';
import React from 'react';

interface FieldWrapperProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  fieldId?: string;
}

export const FieldWrapper = ({
  label,
  description,
  fieldId,
  children,
}: FieldWrapperProps): React.ReactNode => {
  return (
    <div>
      <Label size='small' spacing htmlFor={fieldId}>
        {label}
      </Label>
      {description && (
        <Paragraph short size='small'>
          {description}
        </Paragraph>
      )}
      {children}
    </div>
  );
};
