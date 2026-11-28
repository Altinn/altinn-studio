import { useDisplayDataFor } from 'src/features/displayData/useDisplayData';
import { useRepeatingGroupComponentId } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { useTableComponentIds } from 'src/layout/RepeatingGroup/useTableComponentIds';

/** Names the row's action by the row's first non-empty table cell, such as `Rediger Balder`. */
export function useRowAriaLabel(prefix: string) {
  const baseComponentId = useRepeatingGroupComponentId();
  const rawTableIds = useTableComponentIds(baseComponentId);
  const displayData = useDisplayDataFor(rawTableIds);
  const firstCellData = Object.values(displayData).find((c) => !!c) ?? '';

  return firstCellData ? `${prefix} ${firstCellData}` : prefix;
}
