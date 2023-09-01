import { LayoutStyle } from 'src/layout/common.generated';
import type { ILayoutSet, ILayoutSets } from 'src/types';
import type { IInstance } from 'src/types/shared';

export function getLayoutsetForDataElement(
  instance: IInstance | undefined | null,
  datatype: string | undefined,
  layoutsets: ILayoutSets,
) {
  const currentTaskId = instance?.process?.currentTask?.elementId;
  const foundLayout = layoutsets.sets.find((layoutSet: ILayoutSet) => {
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
