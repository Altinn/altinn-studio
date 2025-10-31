import React, { useId } from 'react';
import { forwardRef, type Ref, type ReactElement } from 'react';
import {
  type SuggestionProps,
  EXPERIMENTAL_Suggestion as Suggestion,
} from '@digdir/designsystemet-react';
import { StudioLabelWrapper } from '../StudioLabelWrapper';
import type { StudioLabelWrapperProps } from '../StudioLabelWrapper/StudioLabelWrapper';
import { StudioField } from '../StudioField';
import { StudioLabel } from '../StudioLabel';
import { StudioParagraph } from '../StudioParagraph';
import { StudioValidationMessage } from '../StudioValidationMessage';
import classes from './StudioSuggestion.module.css';

export type StudioSuggestionProps = SuggestionProps &
  Pick<StudioLabelWrapperProps, 'tagText' | 'required'> & {
    emptyText: string;
    label: string;
    className?: string;
    description?: string;
    error?: string | false;
  };

function StudioSuggestion(
  {
    required,
    tagText,
    label,
    children,
    emptyText,
    className,
    description,
    error,
    ...rest
  }: StudioSuggestionProps,
  ref: Ref<React.ElementRef<typeof Suggestion.Input>>,
): ReactElement {
  const inputId = useId();
  return (
    <StudioField className={className}>
      <StudioLabelWrapper required={required} tagText={tagText}>
        <StudioLabel htmlFor={inputId}>{label}</StudioLabel>
      </StudioLabelWrapper>
      {description && (
        <StudioParagraph className={classes.description}>{description}</StudioParagraph>
      )}
      <Suggestion {...rest}>
        <Suggestion.Input
          id={inputId}
          ref={ref}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
        />
        <Suggestion.Clear />
        <Suggestion.List>
          <Suggestion.Empty>{emptyText}</Suggestion.Empty>
          {children}
        </Suggestion.List>
      </Suggestion>
      {error && <StudioValidationMessage>{error}</StudioValidationMessage>}
    </StudioField>
  );
}

const ForwardedStudioSuggestion = forwardRef(StudioSuggestion);

export { ForwardedStudioSuggestion as StudioSuggestion };
