import dot from 'dot-object';

import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { getComponentDef } from 'src/layout';
import { applyRowContextToComponentId } from 'src/utils/layout/rowContext';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal, CompTypes } from 'src/layout/layout';
import type { AnyComponent, RuntimeChild } from 'src/layout/LayoutComponent';
import type { RowContext } from 'src/utils/layout/rowContext';
import type { BaseRow } from 'src/utils/layout/types';

export type RuntimeNodeParent =
  | {
      type: 'node';
      id: string;
      baseId: string;
    }
  | {
      type: 'page';
      id: string;
      baseId: string;
    };

export type RuntimeNodeRef = {
  id: string;
  baseId: string;
  pageKey: string;
  parentId: string | undefined;
  parent: RuntimeNodeParent;
  rowContexts: RowContext[];
  rowIds: string[];
};

type DeriveNodesContext = {
  state: FormStoreState;
  lookups: LayoutLookups;
  rowsByBinding: Map<string, BaseRow[]>;
};

type WalkNodesArgs = {
  pageKey: string;
  baseId: string;
  parent: RuntimeNodeParent;
  rowContexts: RowContext[];
  output: RuntimeNodeRef[];
};

const emptyArray: never[] = [];

function getRuntimeChildren<Type extends CompTypes>(
  component: CompExternal<Type>,
  childBaseIds: string[],
  rowContexts: RowContext[],
  context: DeriveNodesContext,
): RuntimeChild[] {
  // The generated component registry cannot retain the correlation between a generic type key and its definition.
  const def = getComponentDef(component.type) as unknown as AnyComponent<Type>;
  return def.getRuntimeChildren({
    item: component,
    childBaseIds,
    rowContexts,
    getRows: (binding) => getRows(context, binding),
  });
}

/**
 * Reads and caches repeating-group rows for one derivation pass.
 * Generated nodes require stable row IDs, so incomplete row data fails loudly.
 */
function getRows(context: DeriveNodesContext, binding: IDataModelReference | undefined): BaseRow[] {
  if (!binding) {
    return emptyArray;
  }

  const cacheKey = `${binding.dataType}:${binding.field}`;
  const cached = context.rowsByBinding.get(cacheKey);
  if (cached) {
    return cached;
  }

  const source = context.state.data.models[binding.dataType]?.debouncedCurrentData;
  const rawRows = dot.pick(binding.field, source);
  if (!Array.isArray(rawRows)) {
    context.rowsByBinding.set(cacheKey, emptyArray);
    return emptyArray;
  }

  const rows = rawRows.map((row, index) => {
    const rowId = typeof row === 'object' && row !== null ? (row as Record<string, unknown>)[ALTINN_ROW_ID] : undefined;
    if (typeof rowId !== 'string' || rowId.length === 0) {
      throw new MissingRowIdException(`${binding.field}[${index}]`);
    }

    return { index, uuid: rowId };
  });
  context.rowsByBinding.set(cacheKey, rows);
  return rows;
}

function walkNodes(context: DeriveNodesContext, args: WalkNodesArgs) {
  const component = context.lookups.getComponent(args.baseId);
  const node: RuntimeNodeRef = {
    id: applyRowContextToComponentId(component.id, args.rowContexts),
    baseId: args.baseId,
    pageKey: args.pageKey,
    parentId: args.parent.type === 'node' ? args.parent.id : undefined,
    parent: args.parent,
    rowContexts: args.rowContexts,
    rowIds: args.rowContexts.map((row) => row.rowId),
  };
  args.output.push(node);

  const childBaseIds = context.lookups.componentToChildren[args.baseId] ?? emptyArray;
  if (childBaseIds.length === 0) {
    return;
  }

  const runtimeChildren = getRuntimeChildren(component, childBaseIds, args.rowContexts, context);
  for (const child of runtimeChildren) {
    walkNodes(context, {
      ...args,
      baseId: child.baseId,
      parent: { type: 'node', id: node.id, baseId: args.baseId },
      rowContexts: child.rowContexts,
    });
  }
}

/**
 * Expands the current layout synchronously into lightweight runtime node references.
 */
export function deriveRuntimeNodeRefs(state: FormStoreState, pageKeys?: Iterable<string>): RuntimeNodeRef[] {
  const context: DeriveNodesContext = {
    state,
    lookups: state.bootstrap.layoutLookups,
    rowsByBinding: new Map(),
  };
  const nodes: RuntimeNodeRef[] = [];
  const includedPages = pageKeys ? new Set(pageKeys) : undefined;

  for (const [pageKey, topLevel] of Object.entries(context.lookups.topLevelComponents)) {
    if (includedPages && !includedPages.has(pageKey)) {
      continue;
    }

    for (const baseId of topLevel ?? emptyArray) {
      walkNodes(context, {
        pageKey,
        baseId,
        parent: { type: 'page', id: pageKey, baseId: pageKey },
        rowContexts: [],
        output: nodes,
      });
    }
  }

  return nodes;
}
