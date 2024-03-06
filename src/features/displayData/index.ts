import type { IAttachments } from 'src/features/attachments';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { useAllOptionsSelector } from 'src/features/options/useAllOptions';
import type { FormDataSelector } from 'src/layout';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface DisplayDataProps {
  attachments: IAttachments;
  optionsSelector: ReturnType<typeof useAllOptionsSelector>;
  langTools: IUseLanguage;
  currentLanguage: string;
  formDataSelector: FormDataSelector;
}

export interface DisplayData<Type extends CompTypes> {
  getDisplayData(node: LayoutNode<Type>, displayDataProps: DisplayDataProps): string;
  useDisplayData(node: LayoutNode<Type>): string;
}
