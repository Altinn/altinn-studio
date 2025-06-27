import { useMemo } from 'react';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useComponentIdMutator, useCurrentDataModelLocation } from 'src/utils/layout/DataModelLocation';
import type { IDataModelReference, IMapping } from 'src/layout/common.generated';
import type { CompIntermediate, CompTypes, IDataModelBindings } from 'src/layout/layout';

/**
 * Given a base component id (one without indexes), and potentially a type, this will give you the layout configuration
 * for that component id. This is just as the component was configured in the layout file, and does not mutate anything.
 * This means:
 *  - The `id` property will be the same as `baseComponentId`. It will never be indexed.
 *  - The `dataModelBindings` property will never have any indexes for which row in a repeating group it is in.
 *  - The `mapping` property will never have any indexes for which row in a repeating group it is in.
 */
export function useExternalItem<T extends CompTypes = CompTypes>(baseComponentId: string | undefined, type?: T) {
  const lookups = useLayoutLookups();
  return lookups.getComponent(baseComponentId, type);
}

const emptyArray = [];
function useBindingParts() {
  const location = useCurrentDataModelLocation();
  return useMemo(() => {
    if (!location) {
      return emptyArray;
    }

    const bindingParts: { binding: IDataModelReference; index: number }[] = [];
    const regex = /\[[0-9]+]/g;
    for (const match of location.field.matchAll(regex)) {
      const base = match.input.slice(0, match.index);
      const index = parseInt(match[0].slice(1, -1), 10);
      bindingParts.push({ binding: { dataType: location.dataType, field: base }, index });
    }

    return bindingParts;
  }, [location]);
}

/**
 * Given a base component id (one without indexes), this will give you the 'intermediate' item. That is, the
 * configuration for the component, with data model bindings and mapping resolved to properly indexed paths matching
 * the current path inside the data model.
 */
export function useIntermediateItem<T extends CompTypes = CompTypes>(
  baseComponentId: string | undefined,
  type?: T,
): CompIntermediate<T> | undefined {
  const component = useExternalItem(baseComponentId, type);
  const idMutator = useComponentIdMutator();
  const bindingParts = useBindingParts();

  return useMemo(() => {
    if (!component) {
      return undefined;
    }
    const clone = structuredClone(component) as unknown as CompIntermediate<T>;
    if ('mapping' in clone) {
      clone.mapping = mutateMapping(clone.mapping, bindingParts);
    }
    if ('dataModelBindings' in clone) {
      clone.dataModelBindings = mutateDataModelBindings(clone.dataModelBindings, bindingParts);
    }

    clone.id = idMutator(clone.id);

    return clone;
  }, [component, idMutator, bindingParts]);
}

function mutateDataModelBindings<T extends CompTypes = CompTypes>(
  bindings: IDataModelBindings<T> | undefined,
  parts: ReturnType<typeof useBindingParts>,
): IDataModelBindings<T> | undefined {
  if (!bindings) {
    return undefined;
  }

  const clone = structuredClone(bindings);
  for (const { binding, index } of parts) {
    for (const key of Object.keys(clone)) {
      const target = clone[key] as IDataModelReference | undefined;
      if (!target || binding.dataType !== target.dataType) {
        continue;
      }
      if (target.field === binding.field) {
        // Do not mutate the group binding itself. We only want to mutate children.
        continue;
      }

      clone[key] = {
        dataType: target.dataType,
        field: target.field.replace(binding.field, `${binding.field}[${index}]`),
      };
    }
  }

  return clone;
}

export function useDataModelBindingsFor<T extends CompTypes = CompTypes>(
  baseComponentId: string | undefined,
  type?: T,
): IDataModelBindings<T> | undefined {
  const component = useExternalItem<T>(baseComponentId, type);
  const parts = useBindingParts();
  return useMemo(
    () => mutateDataModelBindings<T>(component?.dataModelBindings as IDataModelBindings<T> | undefined, parts),
    [component, parts],
  );
}

function mutateMapping(mapping: IMapping | undefined, parts: ReturnType<typeof useBindingParts>) {
  if (!mapping) {
    return undefined;
  }
  const clone = structuredClone(mapping);
  for (const [markerIndex, { index: rowIndex }] of parts.entries()) {
    for (const key of Object.keys(clone)) {
      const value = clone[key];
      const newKey = key.replace(`[{${markerIndex}}]`, `[${rowIndex}]`);
      delete clone[key];
      clone[newKey] = value;
    }
  }

  return clone;
}

export function useMappingFor<T extends CompTypes = CompTypes>(baseComponentId: string | undefined, type?: T) {
  const component = useExternalItem<T>(baseComponentId, type);
  const parts = useBindingParts();
  return useMemo(
    () => mutateMapping(component && 'mapping' in component ? component.mapping : undefined, parts),
    [component, parts],
  );
}
