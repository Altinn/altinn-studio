import React from 'react';

import { Field, Textarea } from '@digdir/designsystemet-react';
import type { FieldCounterProps } from '@digdir/designsystemet-react';

export interface TextAreaWithLabelProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  readOnly?: boolean;
  characterLimit?: FieldCounterProps | undefined;
  error?: boolean;
  dataTestId?: string;
  ariaDescribedBy?: string;
  ariaLabel?: string;
  autoComplete?: string;
  style?: React.CSSProperties;
}

export const TextArea: React.FC<TextAreaWithLabelProps> = ({
  id,
  value,
  onChange,
  onBlur,
  readOnly = false,
  characterLimit,
  dataTestId,
  ariaDescribedBy,
  ariaLabel,
  autoComplete,
  style,
}) => (
  <Field>
    <Textarea
      id={id}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      readOnly={readOnly}
      value={value}
      data-testid={dataTestId}
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      autoComplete={autoComplete}
      style={style}
    />
    {characterLimit && <Field.Counter {...characterLimit} />}
  </Field>
);
