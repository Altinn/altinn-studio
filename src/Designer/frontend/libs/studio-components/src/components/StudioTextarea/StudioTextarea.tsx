import React, { forwardRef, useId } from 'react';
import type { Ref, ReactElement } from 'react';
import { Paragraph, Textarea } from '@digdir/designsystemet-react';
import type { TextareaProps } from '@digdir/designsystemet-react';
import { StudioLabelWrapper } from '../StudioLabelWrapper';
import { StudioLabel } from '../StudioLabel';
import { StudioField } from '../StudioField';
import { StudioValidationMessage } from '../StudioValidationMessage';

export type StudioTextareaProps = TextareaProps & {
  tagText?: string;
  label?: string;
  description?: string;
  error?: string | false;
};

function StudioTextarea(
  {
    children,
    required,
    tagText,
    className,
    label,
    description,
    error,
    ...rest
  }: StudioTextareaProps,
  ref: Ref<HTMLTextAreaElement>,
): ReactElement {
  const id: string = useId();
  const descriptionId: string | undefined = description ? `${id}-description` : undefined;
  const hasError: boolean = !!error;

  return (
    <StudioField className={className}>
      {label && (
        <StudioLabel>
          <StudioLabelWrapper required={required} tagText={tagText}>
            {label}
          </StudioLabelWrapper>
        </StudioLabel>
      )}
      {description && <Paragraph id={descriptionId}>{description}</Paragraph>}
      <Textarea ref={ref} aria-describedby={descriptionId} aria-invalid={hasError} {...rest} />
      {hasError && <StudioValidationMessage>{error}</StudioValidationMessage>}
    </StudioField>
  );
}

const ForwardedStudioTextarea = forwardRef(StudioTextarea);

export { ForwardedStudioTextarea as StudioTextarea };
