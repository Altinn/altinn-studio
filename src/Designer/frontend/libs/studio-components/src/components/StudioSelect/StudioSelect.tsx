import type { ReactElement } from 'react';
import classes from './StudioSelect.module.css';
import { Select } from '@digdir/designsystemet-react';
import type { SelectProps } from '@digdir/designsystemet-react';
import { StudioField } from '../StudioField';
import { StudioLabel } from '../StudioLabel';
import { StudioParagraph } from '../StudioParagraph';
import { StudioValidationMessage } from '../StudioValidationMessage';
import cn from 'classnames';

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
  className,
  ...rest
}: StudioSelectProps): ReactElement {
  return (
    <StudioField className={cn(classes.field, className)}>
      <StudioLabel>{label}</StudioLabel>
      {description && <StudioParagraph data-field='description'>{description}</StudioParagraph>}
      <Select {...rest}>{children}</Select>
      {!!error && <StudioValidationMessage>{error}</StudioValidationMessage>}
    </StudioField>
  );
}
