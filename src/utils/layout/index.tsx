import { layoutSetIsDefault } from 'src/features/form/layoutSets/TypeGuards';
import { LayoutStyle } from 'src/layout/common.generated';
import type { ILayoutSet, ILayoutSets } from 'src/layout/common.generated';

export function getLayoutSetForDataElement(
  currentTaskId: string | undefined,
  datatype: string | undefined,
  layoutSets: ILayoutSets,
) {
  return layoutSets.sets.find((layoutSet: ILayoutSet) => {
    if (layoutSet.dataType !== datatype) {
      return false;
    }
    if (layoutSetIsDefault(layoutSet)) {
      return layoutSet.tasks?.some((taskId: string) => taskId === currentTaskId);
    }
    return false;
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
