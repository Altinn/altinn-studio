import React, { useCallback, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { FormStore } from 'src/features/form/FormContext';
import { getDataModelLocationForIndexedNode } from 'src/utils/layout/hierarchy';
import { getCurrentDataModelPath, rowContextsToIdMutators } from 'src/utils/layout/rowContext';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { RowContext } from 'src/utils/layout/rowContext';

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

interface LocationProps {
  groupBinding: IDataModelReference;
  rowIndex: number;
}

export function DataModelLocationProvider({ groupBinding, rowIndex, children }: PropsWithChildren<LocationProps>) {
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
  const lookups = FormStore.bootstrap.useLayoutLookups();
  return useMemo(() => getDataModelLocationForIndexedNode(nodeId, lookups), [lookups, nodeId]);
}

export function DataModelLocationProviderFromNode({ nodeId, children }: PropsWithChildren<{ nodeId: string }>) {
  const { groupBinding, rowIndex } = useDataModelLocationForNodeRaw(nodeId);

  if (!groupBinding || rowIndex === undefined) {
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

export function useComponentIdMutator(skipLastMutator = false): IdMutator {
  const mutators = useCtx()?.idMutators;
  return useCallback(
    (id) => {
      let newId = id;
      for (const [index, mutator] of mutators?.entries() ?? []) {
        if (skipLastMutator && mutators && index === mutators.length - 1) {
          continue;
        }
        newId = mutator(newId);
      }

      return newId;
    },
    [mutators, skipLastMutator],
  );
}

/**
 * This will give you a properly indexed ID, given a base component ID. I.e. 'currentValue' will give
 * you 'currentValue-0' when we're in the first row inside a repeating group.
 *
 * @see useIndexedComponentIds - An alternative (more complex) solution that will complain if the target ID does not
 * belong here, according to the layout structure.
 */
export function useIndexedId(baseId: string, skipLastMutator?: boolean): string;
export function useIndexedId(baseId: string | undefined, skipLastMutator?: boolean): string | undefined;
export function useIndexedId(baseId: unknown, skipLastMutator = false) {
  const idMutator = useComponentIdMutator(skipLastMutator);
  return useMemo(() => (typeof baseId === 'string' ? idMutator(baseId) : baseId), [baseId, idMutator]);
}

/**
 * Parses a field path to extract group binding contexts for all array indexes found.
 *
 * For example, given "people[0].addresses[1].street", this returns:
 * [
 *   { groupBinding: { dataType, field: "people" }, rowIndex: 0 },
 *   { groupBinding: { dataType, field: "people[0].addresses" }, rowIndex: 1 }
 * ]
 */
function parseGroupContexts(reference: IDataModelReference) {
  const contexts: LocationProps[] = [];

  const parts = reference.field.split('.');
  let currentPath = '';

  for (const part of parts) {
    if (currentPath) {
      currentPath += '.';
    }

    // Check if this part contains an array index
    const arrayMatch = part.match(/^(.+)\[(\d+)]$/);
    if (arrayMatch) {
      const [, arrayName, indexStr] = arrayMatch;
      const groupPath = currentPath + arrayName;
      const rowIndex = parseInt(indexStr, 10);

      contexts.push({
        groupBinding: { dataType: reference.dataType, field: groupPath },
        rowIndex,
      });

      currentPath += part;
    } else {
      currentPath += part;
    }
  }

  return contexts;
}

interface NestedLocationProps {
  reference: IDataModelReference;
}

/**
 * Component to render nested DataModelLocationProviders for field paths with repeating group indexes.
 */
export function NestedDataModelLocationProviders({ reference, children }: PropsWithChildren<NestedLocationProps>) {
  const groupContexts = parseGroupContexts(reference);
  if (groupContexts.length === 0) {
    return children;
  }

  // Recursively nest the providers from outermost to innermost
  return groupContexts.reduceRight(
    (child, { groupBinding, rowIndex }) => (
      <DataModelLocationProvider
        key={`${groupBinding.dataType}-${groupBinding.field}-${rowIndex}`}
        groupBinding={groupBinding}
        rowIndex={rowIndex}
      >
        {child}
      </DataModelLocationProvider>
    ),
    children as React.ReactElement,
  );
}

export function DataModelLocationProviderFromRowContexts({
  rowContexts,
  children,
}: PropsWithChildren<{ rowContexts: RowContext[] }>) {
  const parentCtx = useCtx();
  const value = useMemo(() => {
    const reference = getCurrentDataModelPath(rowContexts);
    if (!reference) {
      return undefined;
    }

    return {
      reference,
      idMutators: [...(parentCtx?.idMutators ?? []), ...rowContextsToIdMutators(rowContexts)],
    };
  }, [parentCtx?.idMutators, rowContexts]);

  if (rowContexts.length === 0) {
    return children;
  }

  return <Provider value={value}>{children}</Provider>;
}
