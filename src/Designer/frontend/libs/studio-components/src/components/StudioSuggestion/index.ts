import { StudioSuggestion as Root } from './StudioSuggestion';
import { StudioSuggestionOption } from './StudioSuggestionOption/StudioSuggestionOption';

type StudioSuggestion = typeof Root & {
  Option: typeof StudioSuggestionOption;
};

const StudioSuggestion = Root as StudioSuggestion;
StudioSuggestion.Option = StudioSuggestionOption;

export { StudioSuggestion };
