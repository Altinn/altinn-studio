import React from 'react';
import { forwardRef, type Ref, type ReactElement } from 'react';
import {
  type SuggestionProps,
  EXPERIMENTAL_Suggestion as Suggestion,
} from '@digdir/designsystemet-react';
import { StudioLabelWrapper } from '../StudioLabelWrapper';
import { StudioFieldset, type StudioFieldsetProps } from '../StudioFieldset';
import type { StudioLabelWrapperProps } from '../StudioLabelWrapper/StudioLabelWrapper';

export type StudioSuggestionProps = SuggestionProps &
  StudioFieldsetProps &
  Pick<StudioLabelWrapperProps, 'tagText' | 'required'> & { emptyText: string };

function StudioSuggestion(
  { required, tagText, legend, children, description, emptyText, ...rest }: StudioSuggestionProps,
  ref: Ref<React.ElementRef<typeof Suggestion>>,
): ReactElement {
  return (
    <StudioFieldset
      legend={
        <StudioLabelWrapper required={required} tagText={tagText}>
          {legend}
        </StudioLabelWrapper>
      }
      description={description}
    >
      <Suggestion {...rest} ref={ref}>
        <Suggestion.Input />
        <Suggestion.Clear />
        <Suggestion.List>
          <Suggestion.Empty>{emptyText}</Suggestion.Empty>
          {children}
        </Suggestion.List>
      </Suggestion>
    </StudioFieldset>
  );
}

const ForwardedStudioSuggestion = forwardRef(StudioSuggestion);

export { ForwardedStudioSuggestion as StudioSuggestion };
