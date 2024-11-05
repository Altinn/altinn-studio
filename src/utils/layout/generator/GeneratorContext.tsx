import React, { useMemo } from 'react';
import type { MutableRefObject, PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal, CompIntermediate, CompIntermediateExact, CompTypes, ILayouts } from 'src/layout/layout';
import type { Registry } from 'src/utils/layout/generator/GeneratorStages';
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

type GlobalProviderProps = Pick<GeneratorContext, 'layouts' | 'layoutMap' | 'registry'>;

type PageProviderProps = Pick<GeneratorContext, 'childrenMap'> & {
  parent: LayoutPage;
};

type NodeGeneratorProps = Pick<GeneratorContext, 'directMutators' | 'recursiveMutators'> & {
  item: CompIntermediateExact<CompTypes>;
  parent: LayoutNode;
};

type RowGeneratorProps = Pick<GeneratorContext, 'directMutators' | 'recursiveMutators'> & {
  groupBinding: IDataModelReference;
  rowIndex: number;
};

interface GeneratorContext {
  registry: MutableRefObject<Registry>;
  directMutators?: ChildMutator[];
  recursiveMutators?: ChildMutator[];
  layouts: ILayouts;
  layoutMap: Record<string, CompExternal>;
  childrenMap: ChildClaimsMap | undefined;
  page: LayoutPage | undefined;
  parent: LayoutNode | LayoutPage | undefined;
  item: CompIntermediateExact<CompTypes> | undefined;
  row:
    | {
        index: number;
        binding: IDataModelReference;
      }
    | undefined;
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
export function GeneratorNodeProvider({ children, ...rest }: PropsWithChildren<NodeGeneratorProps>) {
  const parent = useCtx();
  const value: GeneratorContext = useMemo(
    () => ({
      // Inherit all values from the parent, overwrite with our own if they are passed
      ...parent,
      ...rest,

      // Direct mutators and rows are not meant to be inherited, if none are passed to us directly we'll reset
      directMutators: rest.directMutators ?? emptyArray,
      row: parent.row ?? undefined,

      recursiveMutators: parent.recursiveMutators
        ? [...parent.recursiveMutators, ...(rest.recursiveMutators ?? [])]
        : rest.recursiveMutators,

      depth: parent.depth + 1,
    }),
    [parent, rest],
  );

  return <Provider value={value}>{children}</Provider>;
}

/**
 * This provider is meant to be used for pages, i.e. the top level components in the hierarchy. Above that
 * we have the GeneratorGlobalProvider.
 */
export function GeneratorPageProvider({ children, ...rest }: PropsWithChildren<PageProviderProps>) {
  const parent = useCtx();
  const value: GeneratorContext = useMemo(
    () => ({
      ...parent,
      page: rest.parent,

      // For a page, the depth starts at 1 because in principle the page is the top level node, at depth 0, so
      // when a page provides a depth indicator to its children (the top level components on that page), it should be 1.
      depth: 1,

      ...rest,
    }),
    [parent, rest],
  );

  return <Provider value={value}>{children}</Provider>;
}

/**
 * This provider is meant to be used for rows, i.e. each row in a repeating group, or other repeating components.
 */
export function GeneratorRowProvider({
  children,
  rowIndex,
  groupBinding,
  directMutators,
  recursiveMutators,
}: PropsWithChildren<RowGeneratorProps>) {
  const parent = useCtx();
  const value: GeneratorContext = useMemo(
    () => ({
      // Inherit all values from the parent, overwrite with our own if they are passed
      ...parent,
      row: {
        index: rowIndex,
        binding: groupBinding,
      },

      // Direct mutators and rows are not meant to be inherited, if none are passed to us directly we'll reset
      directMutators: directMutators ?? emptyArray,
      recursiveMutators: parent.recursiveMutators
        ? [...parent.recursiveMutators, ...(recursiveMutators ?? [])]
        : recursiveMutators,
    }),
    [parent, directMutators, recursiveMutators, rowIndex, groupBinding],
  );
  return <Provider value={value}>{children}</Provider>;
}

export function GeneratorGlobalProvider({ children, ...rest }: PropsWithChildren<GlobalProviderProps>) {
  const value: GeneratorContext = useMemo(
    () => ({
      item: undefined,
      row: undefined,
      depth: 0,
      childrenMap: undefined,
      parent: undefined,
      page: undefined,
      ...rest,
    }),
    [rest],
  );
  return <Provider value={value}>{children}</Provider>;
}

export const GeneratorInternal = {
  useIsInsideGenerator: () => useCtx().depth > 0,
  useRegistry: () => useCtx().registry,
  useDirectMutators: () => useCtx().directMutators ?? emptyArray,
  useRecursiveMutators: () => useCtx().recursiveMutators ?? emptyArray,
  useDepth: () => useCtx().depth,
  useLayouts: () => useCtx().layouts,
  useLayoutMap: () => useCtx().layoutMap,
  useChildrenMap: () => useCtx().childrenMap,
  useParent: () => useCtx().parent,
  usePage: () => useCtx().page,
  useRowBinding: () => useCtx().row?.binding,
  useRowIndex: () => useCtx().row?.index,
  useIntermediateItem: () => useCtx().item,
};
