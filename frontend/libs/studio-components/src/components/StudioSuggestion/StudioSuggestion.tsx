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

export type StudioSuggestionProps = SuggestionProps &
  Pick<StudioLabelWrapperProps, 'tagText' | 'required'> & {
    emptyText: string;
    label: string;
    className?: string;
  };

function StudioSuggestion(
  { required, tagText, label, children, emptyText, className, ...rest }: StudioSuggestionProps,
  ref: Ref<React.ElementRef<typeof Suggestion.Input>>,
): ReactElement {
  const labelId = useId();
  return (
    <StudioField className={className}>
      <StudioLabelWrapper required={required} tagText={tagText}>
        <StudioLabel id={labelId}>{label}</StudioLabel>
      </StudioLabelWrapper>
      <Suggestion {...rest}>
        <Suggestion.Input aria-labelledby={labelId} ref={ref} />
        <Suggestion.Clear />
        <Suggestion.List>
          <Suggestion.Empty>{emptyText}</Suggestion.Empty>
          {children}
        </Suggestion.List>
      </Suggestion>
    </StudioField>
  );
}

const ForwardedStudioSuggestion = forwardRef(StudioSuggestion);

export { ForwardedStudioSuggestion as StudioSuggestion };
