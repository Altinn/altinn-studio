import type { IInputFormatting, ILayoutCompBase, ILayoutCompWillBeSavedWhileTyping } from 'src/layout/layout';

export interface ILayoutCompInput extends ILayoutCompBase<'Input'>, ILayoutCompWillBeSavedWhileTyping {
  formatting?: IInputFormatting;
  variant?: 'text' | 'search';
}
