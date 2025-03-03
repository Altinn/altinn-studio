import { useAttachmentsSelector } from 'src/features/attachments/hooks';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNodeOptionsSelector } from 'src/features/options/useNodeOptions';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { implementsDisplayData } from 'src/layout';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeFormData } from 'src/utils/layout/useNodeItem';
import type { DisplayDataProps } from 'src/features/displayData/index';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function useDisplayDataProps(): Omit<DisplayDataProps, 'formData' | 'nodeId'> {
  const langTools = useLanguage();
  const optionsSelector = useNodeOptionsSelector();
  const attachmentsSelector = useAttachmentsSelector();
  const currentLanguage = useCurrentLanguage();
  const nodeDataSelector = NodesInternal.useNodeDataSelector();

  return useShallowMemo({
    optionsSelector,
    attachmentsSelector,
    langTools,
    currentLanguage,
    nodeDataSelector,
  });
}

export function useDisplayData<Type extends CompTypes>(node: LayoutNode<Type> | undefined): string {
  const props = useDisplayDataProps();
  const formData = useNodeFormData(node);
  if (!node) {
    return '';
  }

  const def = node.def;
  if (!implementsDisplayData(def)) {
    return '';
  }

  return def.getDisplayData({ ...props, formData, nodeId: node.id });
}
