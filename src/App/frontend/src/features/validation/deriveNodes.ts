import dot from 'dot-object';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import { getLikertStartStopIndex } from 'src/layout/Likert/rowUtils';
import { collectHiddenSources, evaluateHiddenSources } from 'src/utils/layout/hiddenUtils';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal, CompIntermediate, CompTypes } from 'src/layout/layout';
import type { HiddenSource } from 'src/utils/layout/hiddenUtils';
import type { BaseRow } from 'src/utils/layout/types';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

export type RowContext = {
  groupBinding: IDataModelReference;
  rowIndex: number;
  rowId: string;
};

export type DerivedValidationNode = {
  id: string;
  baseId: string;
  pageKey: string;
  parentId: string | undefined;
  rowContexts: RowContext[];
  rowIds: string[];
  intermediateItem: CompIntermediate;
  hidden: boolean;
  isValid: boolean;
};

type DeriveNodesContext = {
  state: FormStoreState;
  lookups: LayoutLookups;
  hiddenDataSources: ExpressionDataSources;
  pageOrder: string[];
  rowsByBinding: Map<string, BaseRow[]>;
  hiddenSourcesByBaseId: Map<string, HiddenSource[]>;
};

type WalkNodesArgs = {
  pageKey: string;
  baseId: string;
  parentId: string | undefined;
  rowContexts: RowContext[];
  isValid: boolean;
  output: DerivedValidationNode[];
};

type DeriveNodesInputs = {
  pageOrder: string[];
  pdfLayoutName: string | undefined;
  hiddenDataSources: ExpressionDataSources;
};

const emptyArray: never[] = [];

/**
 * Creates expression data sources scoped to the current repeating-group row.
 * Expressions use this runtime path to resolve relative data model references.
 */
export function withCurrentDataModelPath(
  dataSources: ExpressionDataSources,
  currentDataModelPath: IDataModelReference | undefined,
): ExpressionDataSources {
  return {
    ...dataSources,
    currentDataModelPath,
    context: {
      ...dataSources.context,
      currentDataModelPath: () => currentDataModelPath,
    },
  };
}

/**
 * Returns the data model path for the innermost repeating-group row.
 * Components outside repeating groups do not have a current data model path.
 */
export function getCurrentDataModelPath(rowContexts: RowContext[]): IDataModelReference | undefined {
  const current = rowContexts[rowContexts.length - 1];
  if (!current) {
    return undefined;
  }

  return {
    dataType: current.groupBinding.dataType,
    field: `${current.groupBinding.field}[${current.rowIndex}]`,
  };
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
          field: target.field.replace(groupBinding.field, `${groupBinding.field}[${rowIndex}]`),
        };
      }
    }
  }

  if (rowContexts.length > 0) {
    clone.id = `${clone.id}-${rowContexts.map((row) => row.rowIndex).join('-')}`;
  }

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

  const rawRows = dot.pick(binding.field, context.state.data.models[binding.dataType]?.debouncedCurrentData);
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

function getHiddenSources(context: DeriveNodesContext, baseId: string): HiddenSource[] {
  const cached = context.hiddenSourcesByBaseId.get(baseId);
  if (cached) {
    return cached;
  }

  const hiddenSources = collectHiddenSources(baseId, context.lookups).reverse();
  context.hiddenSourcesByBaseId.set(baseId, hiddenSources);
  return hiddenSources;
}

function buildNode(
  context: DeriveNodesContext,
  pageKey: string,
  baseId: string,
  parentId: string | undefined,
  rowContexts: RowContext[],
  isValid: boolean,
): DerivedValidationNode {
  const component = context.lookups.getComponent(baseId);
  const intermediateItem = toIntermediateItem(component, rowContexts);
  const hiddenRuntime = withCurrentDataModelPath(context.hiddenDataSources, getCurrentDataModelPath(rowContexts));
  const hidden = evaluateHiddenSources({
    hiddenSources: getHiddenSources(context, baseId),
    pageOrder: context.pageOrder,
    pageKey,
    respectPageOrder: true,
    evalHiddenExpression: (expr, source) =>
      evalExpr(expr, hiddenRuntime, {
        returnType: ExprVal.Boolean,
        defaultValue: false,
        errorIntroText:
          source.type === 'hiddenPage'
            ? `Hidden expression for page ${source.id} failed`
            : `Expression in property ${source.type} for component ${source.id} failed`,
      }),
  }).hidden;

  return {
    id: intermediateItem.id,
    baseId,
    pageKey,
    parentId,
    rowContexts,
    rowIds: rowContexts.map((row) => row.rowId),
    intermediateItem,
    hidden,
    isValid,
  };
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

function appendRowContext(rowContexts: RowContext[], groupBinding: IDataModelReference, row: BaseRow): RowContext[] {
  return [...rowContexts, { groupBinding, rowIndex: row.index, rowId: row.uuid }];
}

/**
 * Recursively expands layout components into the validation nodes that exist for
 * the current form data, including generated repeating-group and Likert nodes.
 */
function walkNodes(context: DeriveNodesContext, args: WalkNodesArgs) {
  const node = buildNode(context, args.pageKey, args.baseId, args.parentId, args.rowContexts, args.isValid);
  args.output.push(node);

  const childBaseIds = context.lookups.componentToChildren[args.baseId] ?? emptyArray;
  if (childBaseIds.length === 0) {
    return;
  }

  if (node.intermediateItem.type === 'RepeatingGroup') {
    const { repeated, staticChildren } = splitRepeatingChildren(node.intermediateItem, childBaseIds);
    for (const childId of staticChildren) {
      walkNodes(context, { ...args, baseId: childId, parentId: node.id });
    }

    const groupBinding = node.intermediateItem.dataModelBindings.group;
    for (const row of getRows(context, groupBinding)) {
      for (const childId of repeated) {
        walkNodes(context, {
          ...args,
          baseId: childId,
          parentId: node.id,
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
        parentId: node.id,
        rowContexts: appendRowContext(args.rowContexts, questionsBinding, row),
      });
    }
    return;
  }

  for (const childId of childBaseIds) {
    walkNodes(context, { ...args, baseId: childId, parentId: node.id });
  }
}

/**
 * Derives the validation node hierarchy synchronously from the latest form state.
 * The result is intentionally ephemeral so consumers do not depend on stored
 * derived state that can lag behind its source data.
 */
export function deriveNodes(state: FormStoreState, inputs: DeriveNodesInputs): DerivedValidationNode[] {
  const context: DeriveNodesContext = {
    state,
    lookups: state.bootstrap.layoutLookups,
    hiddenDataSources: inputs.hiddenDataSources,
    pageOrder: inputs.pageOrder,
    rowsByBinding: new Map(),
    hiddenSourcesByBaseId: new Map(),
  };
  const nodes: DerivedValidationNode[] = [];

  for (const [pageKey, topLevel] of Object.entries(context.lookups.topLevelComponents)) {
    const isValid = inputs.pageOrder.includes(pageKey) || pageKey === inputs.pdfLayoutName;
    for (const baseId of topLevel ?? emptyArray) {
      walkNodes(context, {
        pageKey,
        baseId,
        parentId: undefined,
        rowContexts: [],
        isValid,
        output: nodes,
      });
    }
  }

  return nodes;
}
