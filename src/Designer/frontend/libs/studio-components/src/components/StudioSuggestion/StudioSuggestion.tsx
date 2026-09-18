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
  // Only a single select has a pending clear: a multiple select keeps its values as chips, and its
  // input is empty whenever the user is not typing.
  const singleSelectProps = props.multiple === true ? undefined : props;
  const commitPendingClear = useCommitPendingClear({
    hasSelection: Boolean(singleSelectProps?.selected),
    onClear: () => singleSelectProps?.onSelectedChange?.(null),
  });

  return (
    <StudioField className={className}>
      <StudioLabelWrapper required={required} tagText={tagText}>
        <StudioLabel htmlFor={inputId}>{label}</StudioLabel>
      </StudioLabelWrapper>
      {description && (
        <StudioParagraph className={classes.description}>{description}</StudioParagraph>
      )}
      <Suggestion
        {...rest}
        onBlur={(event) => {
          rest.onBlur?.(event);
          commitPendingClear.onBlur(event);
        }}
        onMouseDown={(event) => {
          rest.onMouseDown?.(event);
          commitPendingClear.onMouseDown();
        }}
      >
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
