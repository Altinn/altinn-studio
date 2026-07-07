import dot from 'dot-object';

import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { makeLikertChildId } from 'src/layout/Likert/makeLikertChildId';
import { getLikertStartStopIndex } from 'src/layout/Likert/rowUtils';
import { appendRowContext, applyRowContextToComponentId } from 'src/utils/layout/rowContext';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal, CompIntermediate, CompTypes } from 'src/layout/layout';
import type { RowContext } from 'src/utils/layout/rowContext';
import type { BaseRow } from 'src/utils/layout/types';

export type DerivedLayoutParent =
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

export type DerivedLayoutNode = {
  id: string;
  baseId: string;
  pageKey: string;
  parentId: string | undefined;
  parent: DerivedLayoutParent;
  rowContexts: RowContext[];
  rowIds: string[];
  intermediateItem: CompIntermediate;
};

type DeriveNodesContext = {
  state: FormStoreState;
  lookups: LayoutLookups;
  rowsByBinding: Map<string, BaseRow[]>;
};

type WalkNodesArgs = {
  pageKey: string;
  baseId: string;
  parent: DerivedLayoutParent;
  rowContexts: RowContext[];
  output: DerivedLayoutNode[];
};

const emptyArray: never[] = [];

function transposeChildBinding(field: string, groupField: string, rowIndex: number): string | undefined {
  const groupPrefix = `${groupField}.`;
  if (!field.startsWith(groupPrefix)) {
    return undefined;
  }

  return `${groupField}[${rowIndex}]${field.slice(groupField.length)}`;
}

function toIntermediateItem<T extends CompTypes>(
  component: CompExternal<T>,
  rowContexts: RowContext[],
): CompIntermediate<T> {
  const clone = structuredClone(component) as CompIntermediate<T>;
  for (const [markerIndex, { groupBinding, rowIndex }] of rowContexts.entries()) {
    if ('mapping' in clone && clone.mapping) {
      for (const key of Object.keys(clone.mapping)) {
        const value = clone.mapping[key];
        const newKey = key.replace(`[{${markerIndex}}]`, `[${rowIndex}]`);
        delete clone.mapping[key];
        clone.mapping[newKey] = value;
      }
    }

    if ('dataModelBindings' in clone && clone.dataModelBindings) {
      for (const key of Object.keys(clone.dataModelBindings)) {
        const target = clone.dataModelBindings[key] as IDataModelReference | undefined;
        if (!target || target.dataType !== groupBinding.dataType || target.field === groupBinding.field) {
          continue;
        }

        clone.dataModelBindings[key] = {
          dataType: target.dataType,
          field: transposeChildBinding(target.field, groupBinding.field, rowIndex) ?? target.field,
        };
      }
    }
  }

  clone.id = applyRowContextToComponentId(clone.id, rowContexts);

  return clone;
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

function splitRepeatingChildren(component: CompExternal<'RepeatingGroup'>, childIds: string[]) {
  const rawRepeated = component.edit?.multiPage
    ? component.children.map((childId) => childId.split(':', 2)[1])
    : component.children;
  const repeated = new Set(rawRepeated);
  return {
    repeated: childIds.filter((childId) => repeated.has(childId)),
    staticChildren: childIds.filter((childId) => !repeated.has(childId)),
  };
}

function walkNodes(context: DeriveNodesContext, args: WalkNodesArgs) {
  const intermediateItem = toIntermediateItem(context.lookups.getComponent(args.baseId), args.rowContexts);
  const node: DerivedLayoutNode = {
    id: intermediateItem.id,
    baseId: args.baseId,
    pageKey: args.pageKey,
    parentId: args.parent.type === 'node' ? args.parent.id : undefined,
    parent: args.parent,
    rowContexts: args.rowContexts,
    rowIds: args.rowContexts.map((row) => row.rowId),
    intermediateItem,
  };
  args.output.push(node);

  const childBaseIds = context.lookups.componentToChildren[args.baseId] ?? emptyArray;
  if (childBaseIds.length === 0) {
    return;
  }

  if (node.intermediateItem.type === 'RepeatingGroup') {
    const { repeated, staticChildren } = splitRepeatingChildren(node.intermediateItem, childBaseIds);
    for (const childId of staticChildren) {
      walkNodes(context, { ...args, baseId: childId, parent: { type: 'node', id: node.id, baseId: args.baseId } });
    }

    const groupBinding = node.intermediateItem.dataModelBindings.group;
    for (const row of getRows(context, groupBinding)) {
      for (const childId of repeated) {
        walkNodes(context, {
          ...args,
          baseId: childId,
          parent: { type: 'node', id: node.id, baseId: args.baseId },
          rowContexts: appendRowContext(args.rowContexts, groupBinding, row),
        });
      }
    }
    return;
  }

  if (node.intermediateItem.type === 'Likert') {
    const questionsBinding = node.intermediateItem.dataModelBindings.questions;
    const rows = getRows(context, questionsBinding);
    const { startIndex, stopIndex } = getLikertStartStopIndex(rows.length - 1, node.intermediateItem.filter);
    const childId = makeLikertChildId(args.baseId);
    for (const row of rows.slice(startIndex, stopIndex + 1)) {
      walkNodes(context, {
        ...args,
        baseId: childId,
        parent: { type: 'node', id: node.id, baseId: args.baseId },
        rowContexts: appendRowContext(args.rowContexts, questionsBinding, row),
      });
    }
    return;
  }

  for (const childId of childBaseIds) {
    walkNodes(context, { ...args, baseId: childId, parent: { type: 'node', id: node.id, baseId: args.baseId } });
  }
}

/**
 * Expands the current layout synchronously without storing derived node state.
 */
export function deriveLayoutNodes(state: FormStoreState, pageKeys?: Iterable<string>): DerivedLayoutNode[] {
  const context: DeriveNodesContext = {
    state,
    lookups: state.bootstrap.layoutLookups,
    rowsByBinding: new Map(),
  };
  const nodes: DerivedLayoutNode[] = [];
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
