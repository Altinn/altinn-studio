import React, { useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import type { CompIntermediate, CompIntermediateExact, CompTypes, ILayouts } from 'src/layout/layout';

export type ChildMutator<T extends CompTypes = CompTypes> = (item: CompIntermediate<T>) => void;

export type ChildClaims = Set<string>;

export interface ChildClaimsMap {
  [parentId: string]: ChildClaims;
}

type GlobalProviderProps = Pick<GeneratorContext, 'layouts'>;

type PageProviderProps = { pageKey: string };

type NodeGeneratorProps = {
  item: CompIntermediateExact<CompTypes>;
  parentBaseId: string;
};

type RowGeneratorProps = Pick<GeneratorContext, 'recursiveMutators'>;

interface GeneratorContext {
  recursiveMutators?: ChildMutator[];
  layouts: ILayouts;
  parentBaseId: string | undefined;
  parentIndexedId: string | undefined;
  parentType: 'node' | 'page' | undefined;
  item: CompIntermediateExact<CompTypes> | undefined;
  depth: number; // Depth is 1 for top level nodes, 2 for children of top level nodes, etc.
}

const { Provider, useCtx } = createContext<GeneratorContext>({
  name: 'Generator',
  required: true,
});

const emptyArray: never[] = [];

/**
 * This provider will use upper contexts to set the hidden and depth values, as well as inherit recursive
 * mutators from the parent. This way we can have a single recursive mutator that is applied to all children, no
 * matter how many levels of context providers we have.
 *
 * This provider is meant to be used for nodes, i.e. the lowest level components in the hierarchy.
 */
export function GeneratorNodeProvider({ children, parentBaseId, item }: PropsWithChildren<NodeGeneratorProps>) {
  const parentCtx = useCtx();
  const parentIndexedId = useIndexedId(parentBaseId);
  const value: GeneratorContext = useMemo(
    () => ({
      // Inherit all values from the parent, overwrite with our own if they are passed
      ...parentCtx,
      parentBaseId,
      parentIndexedId,
      parentType: 'node',
      item,

      depth: parentCtx.depth + 1,
    }),
    [parentCtx, parentBaseId, item, parentIndexedId],
  );

  return <Provider value={value}>{children}</Provider>;
}

/**
 * This provider is meant to be used for pages, i.e. the top level components in the hierarchy. Above that
 * we have the GeneratorGlobalProvider.
 */
export function GeneratorPageProvider({ children, pageKey }: PropsWithChildren<PageProviderProps>) {
  const parent = useCtx();
  const value: GeneratorContext = useMemo(
    () => ({
      ...parent,
      parentBaseId: pageKey,
      parentIndexedId: pageKey,
      parentType: 'page',

      // For a page, the depth starts at 1 because in principle the page is the top level node, at depth 0, so
      // when a page provides a depth indicator to its children (the top level components on that page), it should be 1.
      depth: 1,
    }),
    [parent, pageKey],
  );

  return <Provider value={value}>{children}</Provider>;
}

/**
 * This provider is meant to be used for rows, i.e. each row in a repeating group, or other repeating components.
 */
function GeneratorRowProviderInner({ children, recursiveMutators }: PropsWithChildren<RowGeneratorProps>) {
  const parent = useCtx();
  const value: GeneratorContext = useMemo(
    () => ({
      // Inherit all values from the parent, overwrite with our own if they are passed
      ...parent,
      recursiveMutators: parent.recursiveMutators
        ? [...parent.recursiveMutators, ...(recursiveMutators ?? [])]
        : recursiveMutators,
    }),
    [parent, recursiveMutators],
  );
  return <Provider value={value}>{children}</Provider>;
}

export const GeneratorRowProvider = React.memo(GeneratorRowProviderInner);
GeneratorRowProvider.displayName = 'GeneratorRowProvider';

export function GeneratorGlobalProvider({ children, layouts }: PropsWithChildren<GlobalProviderProps>) {
  const value: GeneratorContext = useMemo(
    () => ({
      item: undefined,
      depth: 0,
      parentBaseId: undefined,
      parentIndexedId: undefined,
      parentType: undefined,
      layouts,
    }),
    [layouts],
  );
  return <Provider value={value}>{children}</Provider>;
}

export const GeneratorInternal = {
  useRecursiveMutators: () => useCtx().recursiveMutators ?? emptyArray,
  useDepth: () => useCtx().depth,
  useLayouts: () => useCtx().layouts,
  useParent: () => {
    const ctx = useCtx();
    return { type: ctx.parentType, baseId: ctx.parentBaseId, indexedId: ctx.parentIndexedId };
  },
  useIntermediateItem: () => useCtx().item,
};
