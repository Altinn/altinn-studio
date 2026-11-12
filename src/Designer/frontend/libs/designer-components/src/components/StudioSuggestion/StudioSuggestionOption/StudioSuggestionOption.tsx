import React from 'react';
import {
  EXPERIMENTAL_Suggestion as Suggestion,
  type SuggestionOptionProps,
} from '@digdir/designsystemet-react';
import { forwardRef, type ReactElement, type Ref } from 'react';

export type StudioSuggestionOptionProps = SuggestionOptionProps;

function StudioSuggestionOption(
  { children, ...rest }: StudioSuggestionOptionProps,
  ref: Ref<React.ElementRef<typeof Suggestion.Option>>,
): ReactElement {
  return (
    <Suggestion.Option {...rest} ref={ref}>
      {children}
    </Suggestion.Option>
  );
}

const ForwardedStudioSuggestionOption = forwardRef(StudioSuggestionOption);

export { ForwardedStudioSuggestionOption as StudioSuggestionOption };
