import type { ILayoutCompBase, ILayoutCompWillBeSavedWhileTyping } from 'src/layout/layout';
import type { HTMLAutoCompleteValues } from 'src/types/shared';

export type ILayoutCompTextArea = ILayoutCompBase<'TextArea'> &
  ILayoutCompWillBeSavedWhileTyping & { autocomplete?: HTMLAutoCompleteValues };
