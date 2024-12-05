import React from 'react';

import { Textarea } from '@digdir/designsystemet-react';
import type { CharacterLimitProps } from '@digdir/designsystemet-react/dist/types/components/form/CharacterCounter';

export interface TextAreaWithLabelProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  readOnly?: boolean;
  characterLimit?: CharacterLimitProps | undefined;
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
  error = false,
  dataTestId,
  ariaDescribedBy,
  ariaLabel,
  autoComplete,
  style,
}) => (
  <Textarea
    id={id}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    readOnly={readOnly}
    characterLimit={characterLimit}
    error={error}
    value={value}
    data-testid={dataTestId}
    aria-describedby={ariaDescribedBy}
    aria-label={ariaLabel}
    autoComplete={autoComplete}
    style={style}
  />
);
