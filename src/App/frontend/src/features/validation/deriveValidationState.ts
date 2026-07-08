import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import {
  type AnyValidation,
  type FieldValidation,
  FrontendValidationSource,
  type NodeRefValidation,
  type NodeVisibility,
  ValidationMask,
  type ValidationSeverity,
} from 'src/features/validation';
import { deriveNodes, withCurrentDataModelPath } from 'src/features/validation/deriveNodes';
import { getInitialMaskFromItem, selectValidations } from 'src/features/validation/utils';
import {
  type CompDef,
  type ComponentValidationContext,
  getComponentDef,
  implementsValidateComponent,
  implementsValidateEmptyField,
  type ValidationFilter,
} from 'src/layout';
import { getDerivedNodeDescendantIds } from 'src/utils/layout/derivedNodeTraversal';
import { getCurrentDataModelPath, getRuntimeIntermediateItem } from 'src/utils/layout/rowContext';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { DerivedValidationNode, DeriveNodesInputs } from 'src/features/validation/deriveNodes';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompIntermediate } from 'src/layout/layout';
import type { IData } from 'src/types/shared';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

type BindingEntry = [bindingKey: string, reference: IDataModelReference];
type BoundFieldValidation = FieldValidation & { bindingKey: string };

export type ValidationVisibilityBreakdown = {
  initial: number;
  form: number;
  page: number;
  row: number;
  effective: number;
};

export type DerivedValidationState = {
  nodes: DerivedValidationNode[];
  nodeById: Map<string, DerivedValidationNode>;
  nodeIdsByPage: Map<string, string[]>;
  nodeIdsByRowId: Map<string, string[]>;
  rawValidationsByNode: Map<string, AnyValidation[]>;
  visibleBreakdownByNode: Map<string, ValidationVisibilityBreakdown>;
};

export interface DerivedValidationStateInputs extends DeriveNodesInputs {
  evalDataSources: ExpressionDataSources;
  instanceData: IData[];
  taskId: string | undefined;
}

const emptyArray: never[] = [];
export const emptyBreakdown: ValidationVisibilityBreakdown = {
  initial: 0,
  form: 0,
  page: 0,
  row: 0,
  effective: 0,
};

function isDataModelReference(reference: unknown): reference is IDataModelReference {
  return (
    typeof reference === 'object' &&
    reference !== null &&
    'dataType' in reference &&
    typeof reference.dataType === 'string' &&
    'field' in reference &&
    typeof reference.field === 'string'
  );
}

function getBindings(item: CompIntermediate): BindingEntry[] {
  const bindings = item.dataModelBindings;
  return bindings
    ? Object.entries(bindings).filter((entry): entry is BindingEntry => isDataModelReference(entry[1]))
    : [];
}

function shouldValidateNode(item: CompIntermediate): boolean {
  return !('renderAsSummary' in item && item.renderAsSummary);
}

function getExpressionValidations(
  state: FormStoreState,
  dataSources: ExpressionDataSources,
  bindings: BindingEntry[],
): BoundFieldValidation[] {
  const validations: BoundFieldValidation[] = [];
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
        validations.push({
          field: reference.field,
          dataElementId,
          source: FrontendValidationSource.Expression,
          message: { key: message },
          severity: def.severity,
          category: def.showImmediately ? 0 : ValidationMask.Expression,
          bindingKey,
        });
      }
    }
  }

  return validations;
}

function makeComponentValidationContext(
  node: DerivedValidationNode,
  item: CompIntermediate,
  state: FormStoreState,
  dataSources: ExpressionDataSources,
  instanceData: IData[],
  taskId: string | undefined,
): ComponentValidationContext {
  return {
    baseComponentId: node.baseId,
    component: item,
    formState: state,
    instanceData,
    taskId,
    expressionDataSources: withCurrentDataModelPath(dataSources, getCurrentDataModelPath(node.rowContexts)),
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

function implementsValidationFilter(def: CompDef): def is CompDef & ValidationFilter {
  return 'getValidationFilters' in def;
}

function applyValidationFilters(
  validations: AnyValidation[],
  node: DerivedValidationNode,
  def: CompDef,
  state: FormStoreState,
): AnyValidation[] {
  if (!implementsValidationFilter(def)) {
    return validations;
  }

  const filters = def.getValidationFilters(node.baseId, state.bootstrap.layoutLookups);
  return filters.length
    ? validations.filter((validation, index, all) => filters.every((filter) => filter(validation, index, all)))
    : validations;
}

function getRawValidationsForNode(
  node: DerivedValidationNode,
  item: CompIntermediate,
  state: FormStoreState,
  dataSources: ExpressionDataSources,
  instanceData: IData[],
  taskId: string | undefined,
): AnyValidation[] {
  if (!node.isValid || !shouldValidateNode(item)) {
    return emptyArray;
  }

  const bindings = getBindings(item);
  const def = getComponentDef(item.type);
  if (!def) {
    return emptyArray;
  }

  const validations = getComponentDefValidations(
    def,
    makeComponentValidationContext(node, item, state, dataSources, instanceData, taskId),
  );

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
    validations.push(...fieldValidations.map((validation) => ({ ...validation, bindingKey })));
  }

  validations.push(
    ...getExpressionValidations(
      state,
      withCurrentDataModelPath(dataSources, getCurrentDataModelPath(node.rowContexts)),
      bindings,
    ),
  );
  return applyValidationFilters(validations, node, def, state);
}

function getVisibilityBreakdown(
  state: FormStoreState,
  node: DerivedValidationNode,
  item: CompIntermediate,
): ValidationVisibilityBreakdown {
  const initial = getInitialMaskFromItem(item);
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

function addToIndex(index: Map<string, string[]>, key: string, nodeId: string) {
  const values = index.get(key);
  if (values) {
    values.push(nodeId);
  } else {
    index.set(key, [nodeId]);
  }
}

/**
 * Builds the complete validation snapshot for the current form state.
 * Alongside calculated validations, the snapshot contains indexes used by
 * selectors so they do not need to rescan the node hierarchy.
 */
export function buildDerivedValidationState(
  state: FormStoreState,
  inputs: DerivedValidationStateInputs,
): DerivedValidationState {
  const nodes = deriveNodes(state, inputs);
  const nodeById = new Map<string, DerivedValidationNode>();
  const nodeIdsByPage = new Map<string, string[]>();
  const nodeIdsByRowId = new Map<string, string[]>();
  const rawValidationsByNode = new Map<string, AnyValidation[]>();
  const visibleBreakdownByNode = new Map<string, ValidationVisibilityBreakdown>();

  for (const node of nodes) {
    const item = getRuntimeIntermediateItem(state.bootstrap.layoutLookups.getComponent(node.baseId), node.rowContexts);
    nodeById.set(node.id, node);
    addToIndex(nodeIdsByPage, node.pageKey, node.id);
    for (const rowId of node.rowIds) {
      addToIndex(nodeIdsByRowId, rowId, node.id);
    }

    rawValidationsByNode.set(
      node.id,
      getRawValidationsForNode(node, item, state, inputs.evalDataSources, inputs.instanceData, inputs.taskId),
    );
    visibleBreakdownByNode.set(node.id, getVisibilityBreakdown(state, node, item));
  }

  return {
    nodes,
    nodeById,
    nodeIdsByPage,
    nodeIdsByRowId,
    rawValidationsByNode,
    visibleBreakdownByNode,
  };
}

/**
 * Selects validations for one generated node after applying visibility and
 * severity filtering. Hidden nodes are excluded unless explicitly requested.
 */
export function getValidationsForNode(
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
  const selected = selectValidations(validations, effectiveMask, severity);
  return selected.length > 0 ? selected : emptyArray;
}

/**
 * Selects validations for one generated node and annotates them with the node
 * identity required by callers that aggregate validations across components.
 */
export function getNodeRefValidations(
  derived: DerivedValidationState,
  nodeId: string,
  mask: NodeVisibility,
  severity?: ValidationSeverity,
  includeHidden = false,
): NodeRefValidation[] {
  const node = derived.nodeById.get(nodeId);
  if (!node) {
    return emptyArray;
  }

  return getValidationsForNode(derived, nodeId, mask, severity, includeHidden).map((validation) => ({
    ...validation,
    baseComponentId: node.baseId,
    nodeId,
  }));
}

/**
 * Returns generated descendants in traversal order. The optional restriction
 * limits results to one row directly below the requested parent node.
 */
export function getValidationDescendantIds(
  derived: DerivedValidationState,
  nodeId: string,
  restriction?: number,
): string[] {
  return getDerivedNodeDescendantIds(derived.nodes, nodeId, restriction);
}
