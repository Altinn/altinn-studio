import { layoutSetIsDefault } from 'src/features/form/layoutSets/TypeGuards';
import { getComponentCapabilities } from 'src/layout';
import type { ILayoutSets } from 'src/layout/common.generated';
import type { ILikertFilter } from 'src/layout/Likert/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export const getLikertStartStopIndex = (lastIndex: number, filters: ILikertFilter = []) => {
  if (typeof lastIndex === 'undefined') {
    return { startIndex: 0, stopIndex: -1 };
  }

  const start = filters.find(({ key }) => key === 'start')?.value;
  const stop = filters.find(({ key }) => key === 'stop')?.value;
  const startIndex = typeof start === 'string' ? parseInt(start) : (start ?? 0);
  const providedStopIndex = typeof stop === 'string' ? parseInt(stop) : stop;

  // For some reason, the stop index configuration is 1-based, while the start index is 0-based in the Likert
  // configuration. We'll work around that here, but it should be fixed in Likert2.
  const stopIndex = typeof providedStopIndex === 'number' ? providedStopIndex - 1 : lastIndex;

  const boundedStopIndex = Math.min(stopIndex, lastIndex);

  return { startIndex, stopIndex: boundedStopIndex };
};

/**
 * Takes a layout and splits it into two return parts; the last will contain
 * all the buttons on the bottom of the input layout, while the first returned
 * value is the input layout except for these extracted components.
 */
export function extractBottomButtons(topLevelNodes: LayoutNode[]) {
  const all = [...topLevelNodes];
  const toMainLayout: string[] = [];
  const toErrorReport: string[] = [];
  for (const node of all.reverse()) {
    const capabilities = getComponentCapabilities(node.type);
    const isButtonLike = node.isType('ButtonGroup') || (capabilities.renderInButtonGroup && !node.isType('Custom'));
    if (isButtonLike && toMainLayout.length === 0) {
      toErrorReport.push(node.id);
    } else {
      toMainLayout.push(node.id);
    }
  }

  return [toMainLayout.reverse(), toErrorReport.reverse()];
}

/**
 * Some tasks other than data (for instance confirm, or other in the future) can be configured to behave like data steps
 * @param task the task
 * @param layoutSets the layout sets
 */
export function behavesLikeDataTask(task: string | null | undefined, layoutSets: ILayoutSets | null): boolean {
  if (!task) {
    return false;
  }

  return !!layoutSets?.sets.some((set) => layoutSetIsDefault(set) && set.tasks?.includes(task));
}
