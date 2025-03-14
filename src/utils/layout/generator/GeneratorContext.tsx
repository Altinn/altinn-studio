import React, { useMemo } from 'react';
import type { MutableRefObject, PropsWithChildren } from 'react';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompIntermediate, CompIntermediateExact, CompTypes, ILayouts } from 'src/layout/layout';
import type { Registry } from 'src/utils/layout/generator/GeneratorStages';
import type { MultiPageMapping } from 'src/utils/layout/generator/NodeRepeatingChildren';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

export type ChildIdMutator = (id: string) => string;
export type ChildMutator<T extends CompTypes = CompTypes> = (item: CompIntermediate<T>) => void;

export interface ChildClaim {
  pluginKey?: string;
}

export interface ChildClaims {
  [childId: string]: ChildClaim;
}

export interface ChildClaimsMap {
  [parentId: string]: ChildClaims;
}

type GlobalProviderProps = Pick<GeneratorContext, 'layouts' | 'registry'>;

type PageProviderProps = Pick<GeneratorContext, 'isValid'> & {
  parent: LayoutPage;
};

type NodeGeneratorProps = {
  item: CompIntermediateExact<CompTypes>;
  parent: LayoutNode;
};

type RowGeneratorProps = Pick<GeneratorContext, 'idMutators' | 'recursiveMutators' | 'multiPageMapping'> & {
  groupBinding: IDataModelReference;
  rowIndex: number;
};

interface GeneratorContext {
  registry: MutableRefObject<Registry>;
  idMutators?: ChildIdMutator[];
  recursiveMutators?: ChildMutator[];
  layouts: ILayouts;
  page: LayoutPage | undefined;
  parent: LayoutNode | LayoutPage | undefined;
  item: CompIntermediateExact<CompTypes> | undefined;
  multiPageMapping?: MultiPageMapping;
  row:
    | {
        index: number;
        binding: IDataModelReference;
      }
    | undefined;
  depth: number; // Depth is 1 for top level nodes, 2 for children of top level nodes, etc.
  isValid?: boolean; // False when page is not in the page order, and not a pdf page (forwarded to nodes as well)
}

const { Provider, useCtx, useLaxCtx } = createContext<GeneratorContext>({
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
export function GeneratorNodeProvider({ children, parent, item }: PropsWithChildren<NodeGeneratorProps>) {
  const parentCtx = useCtx();
  const value: GeneratorContext = useMemo(
    () => ({
      // Inherit all values from the parent, overwrite with our own if they are passed
      ...parentCtx,
      parent,
      item,
      multiPageMapping: undefined,

      // Direct mutators and rows are not meant to be inherited, and regular non-repeating nodes do not pass them.
      directMutators: emptyArray,
      row: undefined,

      depth: parentCtx.depth + 1,
    }),
    [parentCtx, parent, item],
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
  idMutators,
  recursiveMutators,
  multiPageMapping,
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

      multiPageMapping,
      idMutators: parent.idMutators ? [...parent.idMutators, ...(idMutators ?? [])] : idMutators,
      recursiveMutators: parent.recursiveMutators
        ? [...parent.recursiveMutators, ...(recursiveMutators ?? [])]
        : recursiveMutators,
    }),
    [parent, rowIndex, groupBinding, multiPageMapping, idMutators, recursiveMutators],
  );
  return <Provider value={value}>{children}</Provider>;
}

export function GeneratorGlobalProvider({ children, ...rest }: PropsWithChildren<GlobalProviderProps>) {
  const value: GeneratorContext = useMemo(
    () => ({
      item: undefined,
      row: undefined,
      depth: 0,
      multiPageIndex: undefined,
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
  useIsInsideGenerator: () => {
    const ctx = useLaxCtx();
    return ctx === ContextNotProvided ? false : ctx.depth > 0;
  },
  useRegistry: () => useCtx().registry,
  useIdMutators: () => useCtx().idMutators ?? emptyArray,
  useRecursiveMutators: () => useCtx().recursiveMutators ?? emptyArray,
  useDepth: () => useCtx().depth,
  useLayouts: () => useCtx().layouts,
  useParent: () => useCtx().parent,
  usePage: () => useCtx().page,
  useRowIndex: () => useCtx().row?.index,
  useMultiPageIndex: (baseId: string) => useCtx().multiPageMapping?.[baseId] ?? undefined,
  useIntermediateItem: () => useCtx().item,
  useIsValid: () => useCtx().isValid ?? true,
};
