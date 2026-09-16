import React, { useId, useRef } from 'react';
import { forwardRef, type Ref, type ReactElement } from 'react';
import {
  type SuggestionProps,
  type SuggestionSingleProps,
  EXPERIMENTAL_Suggestion as Suggestion,
} from '@digdir/designsystemet-react';
import { useForwardedRef } from '@studio/hooks';
import { StudioLabelWrapper } from '../StudioLabelWrapper';
import type { StudioLabelWrapperProps } from '../StudioLabelWrapper/StudioLabelWrapper';
import { StudioField } from '../StudioField';
import { StudioLabel } from '../StudioLabel';
import { StudioParagraph } from '../StudioParagraph';
import { StudioValidationMessage } from '../StudioValidationMessage';
import { useCommitPendingClear } from './useCommitPendingClear';
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
  const inputRef = useForwardedRef<HTMLInputElement>(ref);
  const suggestionRef = useRef<React.ElementRef<typeof Suggestion>>(null);

  useCommitPendingClear({
    rootRef: suggestionRef,
    inputRef,
    hasSelection: hasSelection(props),
    onClear: () => clearSelection(props),
  });

  return (
    <StudioField className={className}>
      <StudioLabelWrapper required={required} tagText={tagText}>
        <StudioLabel htmlFor={inputId}>{label}</StudioLabel>
      </StudioLabelWrapper>
      {description && (
        <StudioParagraph className={classes.description}>{description}</StudioParagraph>
      )}
      <Suggestion {...rest} ref={suggestionRef}>
        <Suggestion.Input
          aria-label={label}
          id={inputId}
          ref={inputRef}
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

type SingleSelectSuggestionProps = StudioSuggestionProps & SuggestionSingleProps;

/**
 * Only a single select field can have a pending clear: a multiple select keeps its values as
 * separate chips, and its input is empty whenever the user is not typing.
 */
function isSingleSelect(props: StudioSuggestionProps): props is SingleSelectSuggestionProps {
  return props.multiple !== true;
}

function hasSelection(props: StudioSuggestionProps): boolean {
  if (!isSingleSelect(props)) return false;
  const { selected } = props;
  if (!selected) return false;
  return typeof selected === 'string' ? selected !== '' : selected.value !== '';
}

function clearSelection(props: StudioSuggestionProps): void {
  if (!isSingleSelect(props)) return;
  props.onSelectedChange?.(null);
}

const ForwardedStudioSuggestion = forwardRef(StudioSuggestion);

export { ForwardedStudioSuggestion as StudioSuggestion };
