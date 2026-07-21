import { useMemo } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { useCurrentRowContexts } from 'src/utils/layout/DataModelLocation';
import {
  getIndexedDataModelBindings,
  getIndexedMapping,
  getRuntimeIntermediateItem,
} from 'src/utils/layout/rowContext';
import type { CompIntermediate, CompTypes, IDataModelBindings } from 'src/layout/layout';

/**
 * Given a base component id (one without indexes), and potentially a type, this will give you the layout configuration
 * for that component id. This is just as the component was configured in the layout file, and does not mutate anything.
 * This means:
 *  - The `id` property will be the same as `baseComponentId`. It will never be indexed.
 *  - The `dataModelBindings` property will never have any indexes for which row in a repeating group it is in.
 *  - The `mapping` property will never have any indexes for which row in a repeating group it is in.
 */
export function useExternalItem<T extends CompTypes = CompTypes>(
  baseComponentId: string,
  type?: T | ((type: CompTypes) => boolean),
) {
  const lookups = FormStore.bootstrap.useLayoutLookups();
  return lookups.getComponent(baseComponentId, type);
}

/**
 * Given a base component id (one without indexes), this will give you the 'intermediate' item. That is, the
 * configuration for the component, with data model bindings and mapping resolved to properly indexed paths matching
 * the current path inside the data model.
 */
export function useIntermediateItem<T extends CompTypes = CompTypes>(
  baseComponentId: string,
  type?: T,
): CompIntermediate<T> {
  const component = useExternalItem(baseComponentId, type);
  const rowContexts = useCurrentRowContexts();

  return useMemo(
    () => getRuntimeIntermediateItem(component, rowContexts) as unknown as CompIntermediate<T>,
    [component, rowContexts],
  );
}

export function useDataModelBindingsFor<T extends CompTypes = CompTypes>(
  baseComponentId: string,
  type?: T | ((type: CompTypes) => boolean),
): IDataModelBindings<T> {
  const component = useExternalItem<T>(baseComponentId, type);
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

export function useMappingFor<T extends CompTypes = CompTypes>(baseComponentId: string, type?: T) {
  const component = useExternalItem<T>(baseComponentId, type);
  const rowContexts = useCurrentRowContexts();
  return useMemo(
    () => getIndexedMapping(component && 'mapping' in component ? component.mapping : undefined, rowContexts),
    [component, rowContexts],
  );
}
