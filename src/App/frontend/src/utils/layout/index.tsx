import { LayoutStyle } from 'src/layout/common.generated';
import type { UiFolders } from 'src/features/form/layoutSets/types';

export function getUiFolderIdForDataElement(
  currentTaskId: string | undefined,
  datatype: string | undefined,
  uiFolders: UiFolders,
) {
  if (!currentTaskId || !datatype) {
    return undefined;
  }
  return uiFolders[currentTaskId]?.defaultDataType === datatype ? currentTaskId : undefined;
}

export const shouldUseRowLayout = ({ layout, optionsCount }) => {
  switch (layout) {
    case LayoutStyle.Row:
      return true;
    case LayoutStyle.Column:
      return false;
  }

  return optionsCount < 3;
};
