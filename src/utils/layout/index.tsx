import { LayoutStyle } from 'src/layout/common.generated';
import type { ILayoutSet, ILayoutSets } from 'src/types';
import type { IProcess } from 'src/types/shared';

export function getLayoutSetForDataElement(
  process: IProcess | undefined | null,
  datatype: string | undefined,
  layoutSets: ILayoutSets,
) {
  const currentTaskId = process?.currentTask?.elementId;
  const foundLayout = layoutSets.sets.find((layoutSet: ILayoutSet) => {
    if (layoutSet.dataType !== datatype) {
      return false;
    }
    return layoutSet.tasks?.find((taskId: string) => taskId === currentTaskId);
  });
  return foundLayout?.id;
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
