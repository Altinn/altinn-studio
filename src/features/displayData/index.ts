import type { AttachmentsSelector } from 'src/features/attachments/tools';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { NodeOptionsSelector } from 'src/features/options/OptionsStorePlugin';
import type { CompTypes } from 'src/layout/layout';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type { NodeDataSelector } from 'src/utils/layout/NodesContext';

/** @see useDisplayDataProps */
export interface DisplayDataProps<Type extends CompTypes = CompTypes> {
  attachmentsSelector: AttachmentsSelector;
  optionsSelector: NodeOptionsSelector;
  langTools: IUseLanguage;
  currentLanguage: string;
  nodeDataSelector: NodeDataSelector;
  formData: IComponentFormData<Type> | undefined;
  nodeId: string;
}

export interface DisplayData<Type extends CompTypes> {
  getDisplayData(displayDataProps: DisplayDataProps<Type>): string;
}
