import { useMemo } from 'react';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { getComponentDef } from 'src/layout';
import { CompCategory } from 'src/layout/common';
import type { CompTypes } from 'src/layout/layout';

const emptyArray: never[] = [];
const extraToShowInTable: CompTypes[] = ['Text', 'Number', 'Date', 'Option'];
export function useTableComponentIds(baseComponentId: string) {
  const layoutLookups = useLayoutLookups();
  const component = layoutLookups.getComponent(baseComponentId, 'RepeatingGroup');
  const tableHeaders = component.tableHeaders;
  const multiPage = component.edit?.multiPage ?? false;
  const children = useMemo(
    () =>
      component.children.map((id) => {
        if (multiPage) {
          const [, childId] = id.split(':', 2);
          return layoutLookups.getComponent(childId);
        }

        return layoutLookups.getComponent(id);
      }) ?? emptyArray,
    [component.children, layoutLookups, multiPage],
  );

  return useMemo(() => {
    const ids = children
      .filter((child) =>
        tableHeaders
          ? tableHeaders.includes(child.id)
          : getComponentDef(child.type).category === CompCategory.Form || extraToShowInTable.includes(child.type),
      )
      .map((child) => child.id);

    // Sort using the order from tableHeaders
    if (tableHeaders) {
      ids.sort((a, b) => {
        const aIndex = tableHeaders.indexOf(a);
        const bIndex = tableHeaders.indexOf(b);
        return aIndex - bIndex;
      });
    }

    return ids;
  }, [children, tableHeaders]);
}
