import type { AttachmentsSelector } from 'src/features/attachments/AttachmentsStorePlugin';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { NodeOptionsSelector } from 'src/features/options/OptionsStorePlugin';
import type { FormDataSelector } from 'src/layout';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeDataSelector } from 'src/utils/layout/NodesContext';
import type { NodeFormDataSelector } from 'src/utils/layout/useNodeItem';

export interface DisplayDataProps {
  attachmentsSelector: AttachmentsSelector;
  optionsSelector: NodeOptionsSelector;
  langTools: IUseLanguage;
  currentLanguage: string;
  formDataSelector: FormDataSelector;
  nodeFormDataSelector: NodeFormDataSelector;
  nodeDataSelector: NodeDataSelector;
}

export interface DisplayData<Type extends CompTypes> {
  getDisplayData(node: LayoutNode<Type>, displayDataProps: DisplayDataProps): string;
  useDisplayData(node: LayoutNode<Type>): string;
}
