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
import type { StudioSuggestionItem } from './StudioSuggestionItem/StudioSuggestionItem';
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
  // The web component reports an emptied field on its own, and the commit below reports it when that
  // report is dropped. Whichever comes first is passed on, and the other is not, until the user selects
  // something or focuses the field again.
  const clearReportedRef = useRef(false);
  const reportSelectedChange = (item: StudioSuggestionItem | null): void => {
    if (item === null && clearReportedRef.current) return;
    clearReportedRef.current = item === null;
    singleSelectProps?.onSelectedChange?.(item);
  };
  const commitPendingClear = useCommitPendingClear({
    hasSelection: Boolean(singleSelectProps?.selected),
    onClear: () => reportSelectedChange(null),
  });
  // `rest` is typed for both select modes, but this branch only runs for a single select.
  const suggestionProps: SuggestionProps = singleSelectProps
    ? ({ ...rest, onSelectedChange: reportSelectedChange } as SuggestionProps)
    : rest;

  return (
    <StudioField className={className}>
      <StudioLabelWrapper required={required} tagText={tagText}>
        <StudioLabel htmlFor={inputId}>{label}</StudioLabel>
      </StudioLabelWrapper>
      {description && (
        <StudioParagraph className={classes.description}>{description}</StudioParagraph>
      )}
      <Suggestion
        {...suggestionProps}
        onFocus={(event) => {
          rest.onFocus?.(event);
          clearReportedRef.current = false;
        }}
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
