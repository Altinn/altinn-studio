import { StudioSuggestion as Root } from './StudioSuggestion';
import { StudioSuggestionOption } from './StudioSuggestionOption/StudioSuggestionOption';
export type { StudioSuggestionProps } from './StudioSuggestion';

type StudioSuggestion = typeof Root & {
  Option: typeof StudioSuggestionOption;
};

const StudioSuggestion = Root as StudioSuggestion;
StudioSuggestion.Option = StudioSuggestionOption;

export { StudioSuggestion };
