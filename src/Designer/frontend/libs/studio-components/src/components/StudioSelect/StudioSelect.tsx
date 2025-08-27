import React, { useId } from 'react';
import type { ReactElement } from 'react';
import classes from './StudioSelect.module.css';
import { Select } from '@digdir/designsystemet-react';
import type { SelectProps } from '@digdir/designsystemet-react';
import { StudioField } from '../StudioField';
import { StudioLabel } from '../StudioLabel';
import { StudioParagraph } from '../StudioParagraph';
import { StudioValidationMessage } from '../StudioValidationMessage';

export type StudioSelectProps = {
  label: string;
  description?: string;
  error?: string | false;
} & SelectProps;

export function StudioSelect({
  label,
  description,
  children,
  error,
  ...rest
}: StudioSelectProps): ReactElement {
  const id: string = useId();
  const descriptionId: string | undefined = description ? `${id}-description` : undefined;
  const hasError: boolean = !!error;

  return (
    <StudioField className={classes.field}>
      <StudioLabel>{label}</StudioLabel>
      {description && <StudioParagraph id={descriptionId}>{description}</StudioParagraph>}
      <Select aria-invalid={hasError} aria-describedby={descriptionId} {...rest}>
        {children}
      </Select>
      {hasError && <StudioValidationMessage>{error}</StudioValidationMessage>}
    </StudioField>
  );
}
