import React, { useCallback, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { mutateDataModelBindings, mutateMapping } from 'src/utils/layout/generator/NodeRepeatingChildren';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompIntermediate, CompTypes } from 'src/layout/layout';

export type IdMutator = (id: string) => string;

interface DMLocation {
  reference: IDataModelReference;
  idMutators: IdMutator[];
}

const { Provider, useCtx } = createContext<DMLocation | undefined>({
  name: 'DataModelLocation',
  default: undefined,
  required: false,
});

export const useCurrentDataModelLocation = () => useCtx()?.reference;

export function DataModelLocationProvider({
  groupBinding,
  rowIndex,
  children,
}: PropsWithChildren<{
  groupBinding: IDataModelReference;
  rowIndex: number;
}>) {
  const parentCtx = useCtx();
  const value = useMemo(
    () => ({
      reference: {
        dataType: groupBinding.dataType,
        field: `${groupBinding.field}[${rowIndex}]`,
      },
      idMutators: [...(parentCtx?.idMutators ?? []), (id: string) => `${id}-${rowIndex}`],
    }),
    [parentCtx?.idMutators, rowIndex, groupBinding.dataType, groupBinding.field],
  );
  return <Provider value={value}>{children}</Provider>;
}

function useDataModelLocationForNodeRaw(nodeId: string | undefined) {
  return NodesInternal.useMemoSelector((state) => {
    if (!nodeId) {
      return { groupBinding: undefined, rowIndex: undefined };
    }

    let childId = nodeId;
    let parentId = state.nodeData[childId]?.parentId;
    while (parentId) {
      const child = state.nodeData[childId];
      const parent = state.nodeData[parentId];
      const groupBinding =
        parent.layout.type === 'RepeatingGroup'
          ? parent.layout.dataModelBindings.group
          : parent.layout.type === 'Likert'
            ? parent.layout.dataModelBindings.questions
            : undefined;
      if (groupBinding && child?.rowIndex !== undefined) {
        return { groupBinding, rowIndex: child.rowIndex };
      }

      childId = parentId;
      parentId = state.nodeData[childId]?.parentId;
    }

    return { groupBinding: undefined, rowIndex: undefined };
  });
}

export function useDataModelLocationForNode(nodeId: string | undefined): IDataModelReference | undefined {
  const { groupBinding, rowIndex } = useDataModelLocationForNodeRaw(nodeId);
  return useDataModelLocationForRow(groupBinding, rowIndex);
}

export function DataModelLocationProviderFromNode({ nodeId, children }: PropsWithChildren<{ nodeId: string }>) {
  const { groupBinding, rowIndex } = useDataModelLocationForNodeRaw(nodeId);

  if (!groupBinding) {
    return children;
  }

  return (
    <DataModelLocationProvider
      groupBinding={groupBinding}
      rowIndex={rowIndex}
    >
      {children}
    </DataModelLocationProvider>
  );
}

export function useDataModelLocationForRow(
  groupBinding: IDataModelReference | undefined,
  rowIndex: number | undefined,
) {
  const { dataType, field } = groupBinding ?? {};
  return useMemo(
    () => (dataType && field && rowIndex !== undefined ? { dataType, field: `${field}[${rowIndex}]` } : undefined),
    [dataType, field, rowIndex],
  );
}

export function useComponentIdMutator(): IdMutator {
  const mutators = useCtx()?.idMutators;
  return useCallback(
    (id) => {
      let newId = id;
      for (const mutator of mutators ?? []) {
        newId = mutator(newId);
      }

      return newId;
    },
    [mutators],
  );
}

/**
 * This will give you a properly indexed ID, given a base component ID. I.e. 'currentValue' will give
 * you 'currentValue-0' when we're in the first row inside a repeating group.
 *
 * @see useIndexedComponentIds - An alternative (more complex) solution that will complain if the target ID does not
 * belong here, according to the layout structure.
 */
export function useIndexedId(baseId: string): string;
// eslint-disable-next-line no-redeclare
export function useIndexedId(baseId: string | undefined): string | undefined;
// eslint-disable-next-line no-redeclare
export function useIndexedId(baseId: unknown) {
  const idMutator = useComponentIdMutator();
  return useMemo(() => (typeof baseId === 'string' ? idMutator(baseId) : baseId), [baseId, idMutator]);
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
  const lookups = useLayoutLookups();
  const component = lookups.getComponent(baseComponentId, type);
  const location = useCurrentDataModelLocation();
  const idMutator = useComponentIdMutator();

  return useMemo(() => {
    if (!location || !component) {
      return component as CompIntermediate<T> | undefined;
    }

    const bindingParts: { binding: IDataModelReference; index: number }[] = [];
    const regex = /\[[0-9]+]/g;
    for (const match of location.field.matchAll(regex)) {
      const base = match.input.slice(0, match.index);
      const index = parseInt(match[0].slice(1, -1), 10);
      bindingParts.push({ binding: { dataType: location.dataType, field: base }, index });
    }

    const mutators = [
      ...bindingParts.map(({ binding, index }) => mutateDataModelBindings(index, binding)),
      ...bindingParts.map(({ index }, depth) => mutateMapping(index, depth)),
    ];

    const clone = structuredClone(component) as unknown as CompIntermediate<T>;
    for (const mutator of mutators) {
      mutator(clone);
    }

    clone.id = idMutator(clone.id);

    return clone;
  }, [component, location, idMutator]);
}
