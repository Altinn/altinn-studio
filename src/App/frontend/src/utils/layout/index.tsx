import { LayoutStyle } from 'src/layout/common.generated';
import type { LayoutSet } from 'src/features/layoutSets/types';

export function getLayoutSetForDataElement(
  currentTaskId: string | undefined,
  datatype: string | undefined,
  layoutSets: LayoutSet[],
) {
  return layoutSets.find((layoutSet: LayoutSet) => {
    if (layoutSet.dataType !== datatype) {
      return false;
    }
    return layoutSet.tasks?.some((taskId: string) => taskId === currentTaskId);
  });
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
