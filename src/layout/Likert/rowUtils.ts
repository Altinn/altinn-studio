import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindingsFor, useExternalItem } from 'src/utils/layout/hooks';
import { typedBoolean } from 'src/utils/typing';
import type { ILikertFilter } from 'src/layout/Likert/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export const getLikertStartStopIndex = (lastIndex: number, filters: ILikertFilter = []) => {
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

export function useLikertRows(node: LayoutNode<'Likert'>) {
  const groupBinding = useDataModelBindingsFor(node.baseId, 'Likert')?.questions;
  const filter = useExternalItem(node.baseId, 'Likert').filter;
  const rows = FD.useFreshRows(groupBinding);
  const lastIndex = rows.length - 1;
  const { startIndex, stopIndex } = getLikertStartStopIndex(lastIndex, filter);

  return rows.slice(startIndex, stopIndex + 1).filter(typedBoolean);
}
