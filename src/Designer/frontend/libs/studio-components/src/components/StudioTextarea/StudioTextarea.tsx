import { forwardRef } from 'react';
import type { Ref, ReactElement } from 'react';
import { Textarea } from '@digdir/designsystemet-react';
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
  { children, tagText, className, label, description, error, ...rest }: StudioTextareaProps,
  ref: Ref<HTMLTextAreaElement>,
): ReactElement {
  const hasError: boolean = !!error;

  return (
    <StudioField className={className}>
      {label && (
        <StudioLabel>
          <StudioLabelWrapper required={rest.required} tagText={tagText}>
            {label}
          </StudioLabelWrapper>
        </StudioLabel>
      )}
      {description && <StudioField.Description>{description}</StudioField.Description>}
      <Textarea ref={ref} aria-invalid={hasError} {...rest} />
      {hasError && <StudioValidationMessage>{error}</StudioValidationMessage>}
    </StudioField>
  );
}

const ForwardedStudioTextarea = forwardRef(StudioTextarea);

export { ForwardedStudioTextarea as StudioTextarea };
