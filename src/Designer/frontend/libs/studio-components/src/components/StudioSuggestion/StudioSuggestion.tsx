import React, { useId, useRef } from 'react';
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
import { useSuggestionSelection } from './useSuggestionSelection';
import classes from './StudioSuggestion.module.css';

export type StudioSuggestionProps = SuggestionProps &
  Pick<StudioLabelWrapperProps, 'tagText' | 'required'> & {
    emptyText: string;
    label: string;
    className?: string;
    description?: string;
    error?: string | false;
    placeholder?: string;
  };

function StudioSuggestion(
  props: StudioSuggestionProps,
  ref: Ref<React.ElementRef<typeof Suggestion.Input>>,
): ReactElement {
  const {
    required,
    tagText,
    label,
    children,
    emptyText,
    className,
    description,
    error,
    placeholder,
    ...rest
  } = props;
  const inputId = useId();
  const suggestionRef = useRef<React.ElementRef<typeof Suggestion>>(null);
  const suggestionProps = useSuggestionSelection(rest, suggestionRef);
  return (
    <StudioField className={className}>
      <StudioLabel htmlFor={inputId}>
        <StudioLabelWrapper required={required} tagText={tagText}>
          {label}
        </StudioLabelWrapper>
      </StudioLabel>
      {description && (
        <StudioParagraph className={classes.description}>{description}</StudioParagraph>
      )}
      <Suggestion {...suggestionProps} ref={suggestionRef}>
        <Suggestion.Input
          aria-label={label}
          id={inputId}
          ref={ref}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          placeholder={placeholder}
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
