import { useMemo } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { useCurrentRowContexts } from 'src/utils/layout/DataModelLocation';
import { getIndexedDataModelBindings } from 'src/utils/layout/rowContext';
import type { CompTypes, IDataModelBindings } from 'src/layout/layout';

/**
 * Given a base component id (one without indexes), and potentially a type, this will give you the layout configuration
 * for that component id. This is just as the component was configured in the layout file, and does not mutate anything.
 * This means:
 *  - The `id` property will be the same as `baseComponentId`. It will never be indexed.
 *  - The `dataModelBindings` property will never have any indexes for which row in a repeating group it is in.
 */
export function useComponentConfig<T extends CompTypes = CompTypes>(
  baseComponentId: string,
  type?: T | ((type: CompTypes) => boolean),
) {
  const lookups = FormStore.bootstrap.useLayoutLookups();
  return lookups.getComponent(baseComponentId, type);
}

export function useDataModelBindingsFor<T extends CompTypes = CompTypes>(
  baseComponentId: string,
  type?: T | ((type: CompTypes) => boolean),
): IDataModelBindings<T> {
  const component = useComponentConfig<T>(baseComponentId, type);
  const rowContexts = useCurrentRowContexts();
  return useMemo(
    () =>
      getIndexedDataModelBindings<T>(
        component.dataModelBindings as IDataModelBindings<T>,
        rowContexts,
      ) as IDataModelBindings<T>,
    [component, rowContexts],
  );
}
