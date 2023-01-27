import type { IInputFormatting, ILayoutCompBase, ILayoutCompWillBeSavedWhileTyping } from 'src/layout/layout';
import type { HTMLAutoCompleteValues } from 'src/types/shared';

export interface ILayoutCompInput extends ILayoutCompBase<'Input'>, ILayoutCompWillBeSavedWhileTyping {
  formatting?: IInputFormatting;
  variant?: 'text' | 'search';
  autocomplete?: HTMLAutoCompleteValues;
}
