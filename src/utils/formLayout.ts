import type { ILayoutSets } from 'src/layout/common.generated';
import type { ILikertFilter } from 'src/layout/Likert/config.generated';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

interface SplitKey {
  baseComponentId: string;
  stringDepth: string;
  stringDepthWithLeadingDash: string;
  depth: number[];
}

/**
 * Takes a dashed component id (possibly inside a repeating group row), like 'myComponent-0-1' and returns
 * a workable object:
 *   {
 *     baseComponentId: 'myComponent',
 *     stringDepth: '0-1',
 *     stringDepthWithLeadingDash: '-0-1',
 *     depth: [0, 1],
 *   }
 */
export function splitDashedKey(componentId: string): SplitKey {
  const parts = componentId.split('-');

  const depth: number[] = [];
  while (parts.length) {
    const toConsider = parts.pop();

    // Since our form component IDs are usually UUIDs, they will contain hyphens and may even end in '-<number>'.
    // We'll assume the application has less than 5-digit repeating group elements (the last leg of UUIDs are always
    // longer than 5 digits).
    if (toConsider?.match(/^\d{1,5}$/)) {
      depth.push(parseInt(toConsider, 10));
    } else {
      depth.reverse();
      const stringDepth = depth.join('-').toString();
      return {
        baseComponentId: [...parts, toConsider].join('-'),
        stringDepth,
        stringDepthWithLeadingDash: stringDepth ? `-${stringDepth}` : '',
        depth,
      };
    }
  }

  return {
    baseComponentId: componentId,
    stringDepth: '',
    stringDepthWithLeadingDash: '',
    depth: [],
  };
}

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
 * Checks if there are required fields in this layout (or fields that potentially can be marked as required if some
 * dynamic behaviour dictates it).
 */
export function hasRequiredFields(page: LayoutPage): boolean {
  return !!page.flat(true).find((n) => 'required' in n.item && n.item.required === true);
}

/**
 * Takes a layout and splits it into two return parts; the last will contain
 * all the buttons on the bottom of the input layout, while the first returned
 * value is the input layout except for these extracted components.
 */
export function extractBottomButtons(page: LayoutPage) {
  const all = [...page.children()];
  const toMainLayout: string[] = [];
  const toErrorReport: string[] = [];
  for (const node of all.reverse()) {
    const isButtonLike = node.isType('ButtonGroup') || (node.def.canRenderInButtonGroup() && !node.isType('Custom'));
    if (isButtonLike && toMainLayout.length === 0) {
      toErrorReport.push(node.item.id);
    } else {
      toMainLayout.push(node.item.id);
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

  return layoutSets?.sets.some((set) => set.tasks?.includes(task)) || false;
}
