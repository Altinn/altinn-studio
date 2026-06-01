import { useCallback, useMemo } from 'react';

import dot from 'dot-object';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { FormStore } from 'src/features/form/FormContext';
import { usePdfLayoutName, useRawPageOrder } from 'src/features/form/layoutSettings/processLayoutSettings';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import {
  type AnyValidation,
  type FieldValidation,
  FrontendValidationSource,
  type NodeRefValidation,
  type NodeVisibility,
  ValidationMask,
  type ValidationSeverity,
} from 'src/features/validation';
import { getInitialMaskFromItem, selectValidations } from 'src/features/validation/utils';
import { useAsRef } from 'src/hooks/useAsRef';
import {
  type CompDef,
  type ComponentValidationContext,
  getComponentDef,
  implementsValidateComponent,
  implementsValidateEmptyField,
  type ValidationFilter,
} from 'src/layout';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import { getLikertStartStopIndex } from 'src/layout/Likert/rowUtils';
import { collectHiddenSources, evaluateHiddenSources } from 'src/utils/layout/hiddenUtils';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { FormComponentProps, IDataModelReference, SummarizableComponentProps } from 'src/layout/common.generated';
import type { CompExternal, CompIntermediate, CompInternal, CompTypes, IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver } from 'src/layout/LayoutComponent';
import type { IData } from 'src/types/shared';
import type { BaseRow } from 'src/utils/layout/types';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

type RowContext = {
  groupBinding: IDataModelReference;
  rowIndex: number;
};

type GeneratedNode = {
  id: string;
  baseId: string;
  nodeType: CompTypes;
  pageKey: string;
  parentId: string | undefined;
  depth: number;
  rowIndex: number | undefined;
  rowContexts: RowContext[];
  rowIds: string[];
  dataModelBindings: IDataModelBindings;
  intermediateItem: CompIntermediate;
  item: CompInternal;
  hidden: boolean;
  isValid: boolean;
};

export type ValidationVisibilityBreakdown = {
  initial: number;
  form: number;
  page: number;
  row: number;
  effective: number;
};

type DerivedValidationState = {
  nodes: GeneratedNode[];
  nodeById: Map<string, GeneratedNode>;
  nodeIdsByPage: Map<string, string[]>;
  rawValidationsByNode: Map<string, AnyValidation[]>;
  visibleBreakdownByNode: Map<string, ValidationVisibilityBreakdown>;
};

const emptyArray: never[] = [];
const emptyBreakdown: ValidationVisibilityBreakdown = {
  initial: 0,
  form: 0,
  page: 0,
  row: 0,
  effective: 0,
};

function cloneWithRuntime(
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

function buildExpressionResolverProps<T extends CompTypes>(
  errorIntroText: string,
  rawItem: CompIntermediate<T>,
  allDataSources: ExpressionDataSources,
): ExprResolver<T> {
  const item = rawItem as CompIntermediate<T>;

  const evalProto = <V extends ExprVal>(
    type: V,
    expr: unknown,
    defaultValue: unknown,
    dataSources?: Partial<ExpressionDataSources>,
  ) =>
    evalExpr(expr as never, { ...allDataSources, ...dataSources }, {
      returnType: type,
      defaultValue,
      errorIntroText,
    } as never);

  const evalBool = (expr: unknown, defaultValue: boolean, dataSources?: Partial<ExpressionDataSources>) =>
    evalProto(ExprVal.Boolean, expr, defaultValue, dataSources) as boolean;
  const evalStr = (expr: unknown, defaultValue: string, dataSources?: Partial<ExpressionDataSources>) =>
    evalProto(ExprVal.String, expr, defaultValue, dataSources) as string;
  const evalNum = (expr: unknown, defaultValue: number, dataSources?: Partial<ExpressionDataSources>) =>
    evalProto(ExprVal.Number, expr, defaultValue, dataSources) as number;
  const evalAny = (expr: unknown, defaultValue: unknown, dataSources?: Partial<ExpressionDataSources>) =>
    evalProto(ExprVal.Any, expr, defaultValue, dataSources);

  const evalBase = () => {
    const { hidden: _hidden, ...rest } = item as CompIntermediate & {
      pageBreak?: { breakBefore?: unknown; breakAfter?: unknown };
    };
    return {
      ...rest,
      ...(rest.pageBreak
        ? {
            pageBreak: {
              breakBefore: evalStr(rest.pageBreak.breakBefore, 'auto'),
              breakAfter: evalStr(rest.pageBreak.breakAfter, 'auto'),
            },
          }
        : {}),
    };
  };

  const evalFormProps = () => {
    const out: Partial<FormComponentProps> = {};
    if ('required' in item && Array.isArray(item.required)) {
      out.required = evalBool(item.required, false);
    }
    if ('readOnly' in item && Array.isArray(item.readOnly)) {
      out.readOnly = evalBool(item.readOnly, false);
    }
    return out;
  };

  const evalSummarizable = () => {
    const out: Partial<SummarizableComponentProps> = {};
    if ('forceShowInSummary' in item && Array.isArray(item.forceShowInSummary)) {
      out.forceShowInSummary = evalBool(item.forceShowInSummary, false);
    }
    return out;
  };

  const evalTrb = () => {
    const trb: Record<string, string> = {};
    if (item.textResourceBindings) {
      for (const [key, value] of Object.entries(item.textResourceBindings)) {
        trb[key] = evalStr(value, '');
      }
    }
    return {
      textResourceBindings: item.textResourceBindings ? trb : undefined,
    };
  };

  return {
    item,
    evalBool,
    evalNum,
    evalStr,
    evalAny,
    evalBase,
    evalFormProps,
    evalSummarizable,
    evalTrb,
  } as unknown as ExprResolver<T>;
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

function getCurrentDataModelPath(rowContexts: RowContext[]): IDataModelReference | undefined {
  const current = rowContexts[rowContexts.length - 1];
  if (!current) {
    return undefined;
  }
  return {
    dataType: current.groupBinding.dataType,
    field: `${current.groupBinding.field}[${current.rowIndex}]`,
  };
}

function getRows(state: FormStoreState, binding: IDataModelReference | undefined): BaseRow[] {
  if (!binding) {
    return emptyArray;
  }
  const rawRows = dot.pick(binding.field, state.data.models[binding.dataType]?.debouncedCurrentData);
  if (!Array.isArray(rawRows)) {
    return emptyArray;
  }
  return rawRows.map((row, index) => ({
    index,
    uuid: typeof row?.[ALTINN_ROW_ID] === 'string' ? row[ALTINN_ROW_ID] : String(index),
  }));
}

function getRowIds(state: FormStoreState, rowContexts: RowContext[]): string[] {
  const rowIds: string[] = [];
  for (const rowContext of rowContexts) {
    const rows = getRows(state, rowContext.groupBinding);
    const rowId = rows[rowContext.rowIndex]?.uuid;
    if (rowId) {
      rowIds.push(rowId);
    }
  }
  return rowIds;
}

function buildNode(
  state: FormStoreState,
  lookups: LayoutLookups,
  hiddenDataSources: ExpressionDataSources,
  evalDataSources: ExpressionDataSources,
  pageOrder: string[],
  pageKey: string,
  baseId: string,
  parentId: string | undefined,
  depth: number,
  rowContexts: RowContext[],
  isValid: boolean,
): GeneratedNode {
  const component = lookups.getComponent(baseId);
  const intermediateItem = toIntermediateItem(component, rowContexts);
  const currentDataModelPath = getCurrentDataModelPath(rowContexts);
  const runtimeForNode = cloneWithRuntime(evalDataSources, currentDataModelPath);
  const props = buildExpressionResolverProps(`Invalid expression for ${baseId}`, intermediateItem, runtimeForNode);
  const item = getComponentDef(component.type).evalExpressions(props as never) as CompInternal;

  const hiddenSources = collectHiddenSources(baseId, lookups).reverse();
  const hiddenRuntime = cloneWithRuntime(hiddenDataSources, currentDataModelPath);
  const hidden = evaluateHiddenSources({
    hiddenSources,
    pageOrder,
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
    nodeType: component.type,
    pageKey,
    parentId,
    depth,
    rowIndex: rowContexts[rowContexts.length - 1]?.rowIndex,
    rowContexts,
    rowIds: getRowIds(state, rowContexts),
    dataModelBindings: intermediateItem.dataModelBindings as IDataModelBindings,
    intermediateItem,
    item,
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

function walkNodes(args: {
  state: FormStoreState;
  lookups: LayoutLookups;
  hiddenDataSources: ExpressionDataSources;
  evalDataSources: ExpressionDataSources;
  pageOrder: string[];
  pageKey: string;
  baseId: string;
  parentId: string | undefined;
  depth: number;
  rowContexts: RowContext[];
  isValid: boolean;
  output: GeneratedNode[];
}) {
  const node = buildNode(
    args.state,
    args.lookups,
    args.hiddenDataSources,
    args.evalDataSources,
    args.pageOrder,
    args.pageKey,
    args.baseId,
    args.parentId,
    args.depth,
    args.rowContexts,
    args.isValid,
  );
  args.output.push(node);

  const childBaseIds = args.lookups.componentToChildren[args.baseId] ?? emptyArray;
  if (childBaseIds.length === 0) {
    return;
  }

  if (node.nodeType === 'RepeatingGroup') {
    const component = args.lookups.getComponent(args.baseId, 'RepeatingGroup');
    const { repeated, staticChildren } = splitRepeatingChildren(component, childBaseIds);
    for (const childId of staticChildren) {
      walkNodes({
        ...args,
        baseId: childId,
        parentId: node.id,
        depth: args.depth + 1,
      });
    }

    const groupBinding = (node.dataModelBindings as IDataModelBindings<'RepeatingGroup'>).group;
    for (const row of getRows(args.state, groupBinding)) {
      for (const childId of repeated) {
        walkNodes({
          ...args,
          baseId: childId,
          parentId: node.id,
          depth: args.depth + 1,
          rowContexts: [...args.rowContexts, { groupBinding, rowIndex: row.index }],
        });
      }
    }
    return;
  }

  if (node.nodeType === 'Likert') {
    const questionsBinding = (node.dataModelBindings as IDataModelBindings<'Likert'>).questions;
    const rows = getRows(args.state, questionsBinding);
    const { startIndex, stopIndex } = getLikertStartStopIndex(
      rows.length - 1,
      (node.item as CompInternal<'Likert'>).filter,
    );
    const childId = makeLikertChildId(args.baseId);
    for (const row of rows.slice(startIndex, stopIndex + 1)) {
      walkNodes({
        ...args,
        baseId: childId,
        parentId: node.id,
        depth: args.depth + 1,
        rowContexts: [...args.rowContexts, { groupBinding: questionsBinding, rowIndex: row.index }],
      });
    }
    return;
  }

  for (const childId of childBaseIds) {
    walkNodes({
      ...args,
      baseId: childId,
      parentId: node.id,
      depth: args.depth + 1,
    });
  }
}

function shouldValidateNode(item: CompExternal | CompIntermediate | CompInternal): boolean {
  return !('renderAsSummary' in item && item.renderAsSummary);
}

function getExpressionValidations(
  state: FormStoreState,
  dataSources: ExpressionDataSources,
  bindings: [string, IDataModelReference][],
): FieldValidation[] {
  const out: FieldValidation[] = [];
  for (const [bindingKey, reference] of bindings) {
    const dataModel = state.bootstrap.dataModels[reference.dataType];
    const defs = dataModel?.expressionValidationConfig?.[reference.field.replace(/\[\d+]/g, '')] ?? emptyArray;
    const dataElementId = dataModel?.dataElementId ?? reference.dataType;
    const runtime = {
      ...dataSources,
      formData: {
        ...dataSources.formData,
        defaultDataType: () => reference.dataType,
      },
    };

    for (const def of defs) {
      const valueArguments = { data: { field: reference.field }, defaultKey: 'field' } as const;
      const isInvalid = evalExpr(def.condition, runtime, {
        returnType: ExprVal.Boolean,
        defaultValue: false,
        positionalArguments: [reference.field],
        valueArguments,
      });
      const message = evalExpr(def.message, runtime, {
        returnType: ExprVal.String,
        defaultValue: '',
        positionalArguments: [reference.field],
        valueArguments,
      });

      if (isInvalid) {
        out.push({
          field: reference.field,
          dataElementId,
          source: FrontendValidationSource.Expression,
          message: { key: message },
          severity: def.severity,
          category: def.showImmediately ? 0 : ValidationMask.Expression,
          bindingKey,
        } as FieldValidation);
      }
    }
  }

  return out;
}

function makeComponentValidationContext(
  node: GeneratedNode,
  state: FormStoreState,
  dataSources: ExpressionDataSources,
  instanceData: IData[],
): ComponentValidationContext {
  const runtime = cloneWithRuntime(dataSources, getCurrentDataModelPath(node.rowContexts));
  return {
    component: node.intermediateItem,
    formState: state,
    instanceData,
    expressionDataSources: runtime,
  };
}

function getComponentDefValidations(def: CompDef, ctx: ComponentValidationContext): AnyValidation[] {
  const validations: AnyValidation[] = [];
  if (implementsValidateEmptyField(def)) {
    validations.push(...def.validateEmptyField(ctx));
  }
  if (implementsValidateComponent(def)) {
    validations.push(...def.validateComponent(ctx));
  }
  return validations;
}

function applyValidationFilters(
  validations: AnyValidation[],
  baseId: string,
  def: CompDef,
  lookups: LayoutLookups,
): AnyValidation[] {
  if (!('getValidationFilters' in def)) {
    return validations;
  }
  const filters = (def as CompDef & ValidationFilter).getValidationFilters(baseId, lookups);
  if (!filters.length) {
    return validations;
  }
  return validations.filter((validation, index, all) => filters.every((filter) => filter(validation, index, all)));
}

function getRawValidationsForNode(
  node: GeneratedNode,
  state: FormStoreState,
  lookups: LayoutLookups,
  dataSources: ExpressionDataSources,
  instanceData: IData[],
): AnyValidation[] {
  if (!node.isValid || !shouldValidateNode(node.item)) {
    return emptyArray;
  }

  const bindings = Object.entries((node.dataModelBindings ?? {}) as Record<string, IDataModelReference>);
  const out: AnyValidation[] = [];
  const def = getComponentDef(node.nodeType);
  out.push(...getComponentDefValidations(def, makeComponentValidationContext(node, state, dataSources, instanceData)));

  for (const [bindingKey, reference] of bindings) {
    const dataModel = state.data.models[reference.dataType];
    if (!dataModel) {
      continue;
    }
    const fieldValidations = [
      ...(dataModel.validations.backend[reference.field] ?? emptyArray),
      ...(dataModel.validations.invalidData[reference.field] ?? emptyArray),
      ...(dataModel.validations.schema[reference.field] ?? emptyArray),
    ];
    out.push(...fieldValidations.map((validation) => ({ ...validation, bindingKey })));
  }

  out.push(
    ...getExpressionValidations(
      state,
      cloneWithRuntime(dataSources, getCurrentDataModelPath(node.rowContexts)),
      bindings,
    ),
  );
  return applyValidationFilters(out, node.baseId, def, lookups);
}

function getVisibilityBreakdown(state: FormStoreState, node: GeneratedNode): ValidationVisibilityBreakdown {
  const initial = getInitialMaskFromItem(state.bootstrap.layoutLookups.allComponents[node.baseId]);
  const form = state.validation.formMask ?? 0;
  const page = state.validation.pageMasks[node.pageKey] ?? 0;
  let row = 0;
  for (const rowId of node.rowIds) {
    row |= state.validation.rowMasks[rowId] ?? 0;
  }
  return {
    initial,
    form,
    page,
    row,
    effective: initial | form | page | row,
  };
}

function buildDerivedState(
  state: FormStoreState,
  pageOrder: string[],
  pdfLayoutName: string | undefined,
  hiddenDataSources: ExpressionDataSources,
  evalDataSources: ExpressionDataSources,
  instanceData: IData[],
): DerivedValidationState {
  const nodes: GeneratedNode[] = [];
  for (const [pageKey, topLevel] of Object.entries(state.bootstrap.layoutLookups.topLevelComponents)) {
    const isValid = pageOrder.includes(pageKey) || pageKey === pdfLayoutName;
    for (const baseId of topLevel ?? emptyArray) {
      walkNodes({
        state,
        lookups: state.bootstrap.layoutLookups,
        hiddenDataSources,
        evalDataSources,
        pageOrder,
        pageKey,
        baseId,
        parentId: undefined,
        depth: 1,
        rowContexts: [],
        isValid,
        output: nodes,
      });
    }
  }

  const nodeById = new Map<string, GeneratedNode>();
  const nodeIdsByPage = new Map<string, string[]>();
  const rawValidationsByNode = new Map<string, AnyValidation[]>();
  const visibleBreakdownByNode = new Map<string, ValidationVisibilityBreakdown>();
  for (const node of nodes) {
    nodeById.set(node.id, node);
    const pageNodes = nodeIdsByPage.get(node.pageKey) ?? [];
    pageNodes.push(node.id);
    nodeIdsByPage.set(node.pageKey, pageNodes);
    rawValidationsByNode.set(
      node.id,
      getRawValidationsForNode(node, state, state.bootstrap.layoutLookups, evalDataSources, instanceData),
    );
    visibleBreakdownByNode.set(node.id, getVisibilityBreakdown(state, node));
  }

  return { nodes, nodeById, nodeIdsByPage, rawValidationsByNode, visibleBreakdownByNode };
}

function getValidationsForNode(
  derived: DerivedValidationState,
  nodeId: string,
  mask: NodeVisibility,
  severity?: ValidationSeverity,
  includeHidden = false,
): AnyValidation[] {
  const node = derived.nodeById.get(nodeId);
  if (!node || (!includeHidden && node.hidden)) {
    return emptyArray;
  }
  const validations = derived.rawValidationsByNode.get(nodeId) ?? emptyArray;
  const visibility = derived.visibleBreakdownByNode.get(nodeId) ?? emptyBreakdown;
  const effectiveMask =
    mask === 'visible'
      ? visibility.effective
      : mask === 'showAll'
        ? visibility.effective | ValidationMask.Backend | ValidationMask.CustomBackend
        : mask;
  const out = selectValidations(validations, effectiveMask, severity);
  return out.length > 0 ? out : emptyArray;
}

function getDescendantIds(derived: DerivedValidationState, nodeId: string, restriction?: number) {
  const parent = derived.nodeById.get(nodeId);
  if (!parent) {
    return emptyArray as string[];
  }
  const out: string[] = [];
  for (const node of derived.nodes) {
    if (!node.parentId) {
      continue;
    }
    let current: GeneratedNode | undefined = node;
    while (current?.parentId) {
      if (current.parentId === nodeId) {
        if (restriction === undefined || node.rowContexts[parent.rowContexts.length]?.rowIndex === restriction) {
          out.push(node.id);
        }
        break;
      }
      current = derived.nodeById.get(current.parentId);
    }
  }
  return out;
}

function toNodeRef(baseComponentId: string, nodeId: string, validation: AnyValidation): NodeRefValidation {
  return { ...validation, baseComponentId, nodeId };
}

function useDerivedState() {
  const state = FormStore.raw.useSelector((s) => s);
  const pageOrder = useRawPageOrder();
  const pdfLayoutName = usePdfLayoutName();
  const processedLayouts = FormStore.bootstrap.useLayouts();
  const layoutCollection = FormStore.bootstrap.useLayoutCollection();
  const hiddenDataSources = useExpressionDataSources(layoutCollection, {
    unsupportedDataSources: new Set(['displayValue']),
    errorSuffix: 'hidden expressions',
  });
  const evalDataSources = useExpressionDataSources(processedLayouts);
  const instanceData = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? emptyArray;

  return useMemo(
    () => buildDerivedState(state, pageOrder, pdfLayoutName, hiddenDataSources, evalDataSources, instanceData),
    [state, pageOrder, pdfLayoutName, hiddenDataSources, evalDataSources, instanceData],
  );
}

function useBuildFreshDerivedState() {
  const store = FormStore.raw.useStore();
  const pageOrder = useRawPageOrder();
  const pdfLayoutName = usePdfLayoutName();
  const processedLayouts = FormStore.bootstrap.useLayouts();
  const layoutCollection = FormStore.bootstrap.useLayoutCollection();
  const hiddenDataSources = useExpressionDataSources(layoutCollection, {
    unsupportedDataSources: new Set(['displayValue']),
    errorSuffix: 'hidden expressions',
  });
  const evalDataSources = useExpressionDataSources(processedLayouts);
  const instanceData = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? emptyArray;
  const sourcesRef = useAsRef({ pageOrder, pdfLayoutName, hiddenDataSources, evalDataSources, instanceData });

  return useCallback(() => {
    const { pageOrder, pdfLayoutName, hiddenDataSources, evalDataSources, instanceData } = sourcesRef.current;
    return buildDerivedState(
      store.getState(),
      pageOrder,
      pdfLayoutName,
      hiddenDataSources,
      evalDataSources,
      instanceData,
    );
  }, [sourcesRef, store]);
}

export function useValidationVisibilityBreakdown(indexedId: string | undefined): ValidationVisibilityBreakdown {
  const derived = useDerivedState();
  return indexedId ? (derived.visibleBreakdownByNode.get(indexedId) ?? emptyBreakdown) : emptyBreakdown;
}

export function useRawValidations(indexedId: string | undefined): AnyValidation[] {
  const derived = useDerivedState();
  if (!indexedId) {
    return emptyArray;
  }
  return derived.rawValidationsByNode.get(indexedId) ?? emptyArray;
}

export function useVisibleValidations(indexedId: string | undefined, showAll?: boolean): AnyValidation[] {
  const derived = useDerivedState();
  if (!indexedId) {
    return emptyArray;
  }
  return getValidationsForNode(derived, indexedId, showAll ? 'showAll' : 'visible');
}

export function useVisibleValidationsDeep(
  indexedId: string,
  mask: NodeVisibility,
  includeSelf: boolean,
  restriction?: number,
  severity?: ValidationSeverity,
): NodeRefValidation[] {
  const selector = useVisibleValidationsDeepSelector();
  return selector(indexedId, mask, includeSelf, restriction, severity);
}

export function useVisibleValidationsDeepSelector() {
  const derived = useDerivedState();
  const buildFreshDerivedState = useBuildFreshDerivedState();
  return useCallback(
    (
      indexedId: string,
      mask: NodeVisibility,
      includeSelf: boolean,
      restriction?: number,
      severity?: ValidationSeverity,
    ): NodeRefValidation[] => {
      void derived;
      const freshDerived = buildFreshDerivedState();
      const ids = [
        ...(includeSelf ? [indexedId] : emptyArray),
        ...getDescendantIds(freshDerived, indexedId, restriction),
      ];
      return ids.flatMap((nodeId) =>
        getValidationsForNode(freshDerived, nodeId, mask, severity).map((validation) =>
          toNodeRef(freshDerived.nodeById.get(nodeId)?.baseId ?? '', nodeId, validation),
        ),
      );
    },
    [buildFreshDerivedState, derived],
  );
}

export function useAllValidations(
  mask: NodeVisibility,
  severity?: ValidationSeverity,
  includeHidden = false,
): NodeRefValidation[] {
  const derived = useDerivedState();
  return derived.nodes.flatMap((node) =>
    getValidationsForNode(derived, node.id, mask, severity, includeHidden).map((validation) =>
      toNodeRef(node.baseId, node.id, validation),
    ),
  );
}

export function useValidationsSelector() {
  const derived = useDerivedState();
  const buildFreshDerivedState = useBuildFreshDerivedState();
  return useCallback(
    (nodeId: string, mask: NodeVisibility, severity?: ValidationSeverity, includeHidden = false) => {
      void derived;
      return getValidationsForNode(buildFreshDerivedState(), nodeId, mask, severity, includeHidden);
    },
    [buildFreshDerivedState, derived],
  );
}

export const useLaxValidationsSelector = useValidationsSelector;

export function useGetNodesWithErrors() {
  const derived = useDerivedState();
  const buildFreshDerivedState = useBuildFreshDerivedState();
  return useCallback(
    (mask: NodeVisibility, severity?: ValidationSeverity, includeHidden = false) => {
      void derived;
      const freshDerived = buildFreshDerivedState();
      return freshDerived.nodes.flatMap((node) =>
        getValidationsForNode(freshDerived, node.id, mask, severity, includeHidden),
      );
    },
    [buildFreshDerivedState, derived],
  );
}

export function usePageHasVisibleRequiredValidations(pageKey: string | undefined) {
  const derived = useDerivedState();
  if (!pageKey) {
    return false;
  }
  return (derived.nodeIdsByPage.get(pageKey) ?? emptyArray).some((nodeId) =>
    getValidationsForNode(derived, nodeId, 'visible', 'error').some(
      (validation) => validation.source === FrontendValidationSource.EmptyField,
    ),
  );
}

export function usePruneValidationMasks() {
  const derived = useDerivedState();
  const { formMask, pageMasks, rowMasks } = FormStore.raw.useSelector((state) => state.validation);
  const setFormMask = FormStore.validation.useSetFormValidationMask();
  const setPageMask = FormStore.validation.useSetPageValidationMask();
  const setRowMask = FormStore.validation.useSetRowValidationMask();

  const hasFormErrors = useMemo(
    () =>
      !formMask
        ? true
        : derived.nodes.some((node) => getValidationsForNode(derived, node.id, formMask, 'error').length > 0),
    [derived, formMask],
  );

  const stalePages = useMemo(
    () =>
      Object.entries(pageMasks)
        .filter(
          ([pageKey, mask]) =>
            !(derived.nodeIdsByPage.get(pageKey) ?? emptyArray).some(
              (nodeId) => getValidationsForNode(derived, nodeId, mask, 'error').length > 0,
            ),
        )
        .map(([pageKey]) => pageKey),
    [derived, pageMasks],
  );

  const staleRows = useMemo(
    () =>
      Object.entries(rowMasks)
        .filter(
          ([rowId, mask]) =>
            !derived.nodes.some(
              (node) =>
                node.rowIds.includes(rowId) && getValidationsForNode(derived, node.id, mask, 'error').length > 0,
            ),
        )
        .map(([rowId]) => rowId),
    [derived, rowMasks],
  );

  return useMemo(
    () => ({
      prune() {
        if (formMask && !hasFormErrors) {
          setFormMask(undefined);
        }
        stalePages.forEach((pageKey) => setPageMask(pageKey, undefined));
        staleRows.forEach((rowId) => setRowMask(rowId, undefined));
      },
    }),
    [formMask, hasFormErrors, setFormMask, setPageMask, setRowMask, stalePages, staleRows],
  );
}
