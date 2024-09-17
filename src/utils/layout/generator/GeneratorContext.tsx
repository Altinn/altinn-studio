import React, { useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import type {
  CompExternal,
  CompExternalExact,
  CompIntermediate,
  CompIntermediateExact,
  CompTypes,
} from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

export type ChildMutator<T extends CompTypes = CompTypes> = (item: CompIntermediate<T>) => void;

export interface ChildClaim {
  pluginKey?: string;
  metadata?: unknown;
}

export interface ChildClaims {
  [childId: string]: ChildClaim;
}

export interface ChildClaimsMap {
  [parentId: string]: ChildClaims;
}

type PageProviderProps = Pick<GeneratorContext, 'layoutMap' | 'childrenMap'> & {
  parent: LayoutPage;
};

type NodeGeneratorProps = Pick<GeneratorContext, 'directMutators' | 'recursiveMutators'> & {
  externalItem: CompExternalExact<CompTypes>;
  intermediateItem: CompIntermediateExact<CompTypes>;
  parent: LayoutNode;
};

type RowGeneratorProps = Pick<GeneratorContext, 'directMutators' | 'recursiveMutators'> & {
  rowIndex: number;
};

interface GeneratorContext {
  directMutators?: ChildMutator[];
  recursiveMutators?: ChildMutator[];
  layoutMap: Record<string, CompExternal>;
  childrenMap: ChildClaimsMap;
  parent: LayoutNode | LayoutPage;
  externalItem: CompExternalExact<CompTypes> | undefined;
  intermediateItem: CompIntermediateExact<CompTypes> | undefined;
  rowIndex: number | undefined;
  page: LayoutPage;
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
 */
export function GeneratorProvider({ children, ...rest }: PropsWithChildren<NodeGeneratorProps>) {
  const parent = useCtx();
  const value: GeneratorContext = useMemo(
    () => ({
      // Inherit all values from the parent, overwrite with our own if they are passed
      ...parent,
      ...rest,

      // Direct mutators and rows are not meant to be inherited, if none are passed to us directly we'll reset
      directMutators: rest.directMutators ?? emptyArray,
      rowIndex: parent.rowIndex ?? undefined,

      recursiveMutators: parent.recursiveMutators
        ? [...parent.recursiveMutators, ...(rest.recursiveMutators ?? [])]
        : rest.recursiveMutators,

      depth: parent.depth + 1,
    }),
    [parent, rest],
  );

  return <Provider value={value}>{children}</Provider>;
}

export function GeneratorPageProvider({ children, ...rest }: PropsWithChildren<PageProviderProps>) {
  const value: GeneratorContext = useMemo(
    () => ({
      page: rest.parent,
      externalItem: undefined,
      intermediateItem: undefined,
      rowIndex: undefined,

      // For a page, the depth starts at 1 because in principle the page is the top level node, at depth 0, so
      // when a page provides a depth indicator to its children (the top level components on that page), it should be 1.
      depth: 1,

      ...rest,
    }),
    [rest],
  );

  return <Provider value={value}>{children}</Provider>;
}

export function GeneratorRowProvider({
  children,
  rowIndex,
  directMutators,
  recursiveMutators,
}: PropsWithChildren<RowGeneratorProps>) {
  const parent = useCtx();
  const value: GeneratorContext = useMemo(
    () => ({
      // Inherit all values from the parent, overwrite with our own if they are passed
      ...parent,
      rowIndex,

      // Direct mutators and rows are not meant to be inherited, if none are passed to us directly we'll reset
      directMutators: directMutators ?? emptyArray,
      recursiveMutators: parent.recursiveMutators
        ? [...parent.recursiveMutators, ...(recursiveMutators ?? [])]
        : recursiveMutators,
    }),
    [parent, directMutators, recursiveMutators, rowIndex],
  );
  return <Provider value={value}>{children}</Provider>;
}

export const GeneratorInternal = {
  useDirectMutators: () => useCtx().directMutators ?? emptyArray,
  useRecursiveMutators: () => useCtx().recursiveMutators ?? emptyArray,
  useDepth: () => useCtx().depth,
  useLayoutMap: () => useCtx().layoutMap,
  useChildrenMap: () => useCtx().childrenMap,
  useParent: () => useCtx().parent,
  usePage: () => useCtx().page,
  useRowIndex: () => useCtx().rowIndex,

  useExternalItem: () => useCtx().externalItem,
  useIntermediateItem: () => useCtx().intermediateItem,
};
