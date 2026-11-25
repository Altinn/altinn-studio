import { CompCategory } from '@app/layout-contract';
import dot from 'dot-object';
import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { withCurrentDataModelPath } from 'src/features/validation/deriveNodes';
import { ValidationMask } from 'src/features/validation/index';
import { selectValidations } from 'src/features/validation/utils';
import { getComponentDef } from 'src/layout';
import { getDerivedNodeDescendantIds } from 'src/utils/layout/derivedNodeTraversal';
import {
  getCurrentDataModelPath,
  getIndexedDataModelReference,
  getRowDataModelReference,
} from 'src/utils/layout/rowContext';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { DerivedValidationNode } from 'src/features/validation/deriveNodes';
import type {
  DerivedValidationState,
  DerivedValidationStateInputs,
} from 'src/features/validation/deriveValidationState';
import type {
  FieldValidation,
  NodeRefValidation,
  NodeVisibility,
  ValidationSeverity,
} from 'src/features/validation/index';
import type { CompExternal } from 'src/layout/layout';
import type { RowContext } from 'src/utils/layout/rowContext';

export type RepeatingGroupRowValidations = {
  context: RowContext;
  hidden: boolean;
  /** The `ValidationMask` bits of the group and this row that decide which messages are visible. */
  visibility: number;
  validations: FieldValidation[];
};

/** Only the object directly in this array belongs to the row, not its child fields or nested arrays. */
export function getRepeatingGroupRowIndex(field: string, group: IDataModelReference): number | undefined {
  if (!field.startsWith(group.field)) {
    return undefined;
  }
  const index = field.slice(group.field.length).match(/^\[(\d+)]$/)?.[1];
  return index === undefined ? undefined : Number(index);
}

export function deriveRepeatingGroupRowValidations(
  state: FormStoreState,
  node: DerivedValidationNode,
  item: CompExternal,
  inputs: DerivedValidationStateInputs,
  visibility: number,
): RepeatingGroupRowValidations[] {
  if (item.type !== 'RepeatingGroup' || !node.isValid || item.renderAsSummary) {
    return [];
  }
  const groupBinding = getIndexedDataModelReference(item.dataModelBindings.group, node.rowContexts);
  const model = state.data.models[groupBinding.dataType];
  const rows: unknown = dot.pick(groupBinding.field, model?.debouncedCurrentData);
  if (!model || !Array.isArray(rows)) {
    return [];
  }

  const scope = inputs.descendantScope;
  const scopedRowIndex = scope?.nodeId === node.id ? scope.restriction : undefined;
  const indexes = scopedRowIndex === undefined ? rows.keys() : [scopedRowIndex];
  return Array.from(indexes).flatMap((rowIndex) => {
    if (rowIndex < 0 || rowIndex >= rows.length) {
      return [];
    }
    const row: unknown = rows[rowIndex];
    const { field } = getRowDataModelReference({ groupBinding, rowIndex });
    const validations = [
      ...(model.validations.backend[field] ?? []).filter(
        (validation) => !validation.componentId || validation.componentId === node.id,
      ),
      ...(model.validations.invalidData[field] ?? []),
      ...(model.validations.schema[field] ?? []),
    ];
    if (validations.length === 0) {
      return [];
    }
    const rowId = typeof row === 'object' && row !== null && ALTINN_ROW_ID in row ? row[ALTINN_ROW_ID] : undefined;
    if (typeof rowId !== 'string' || rowId.length === 0) {
      throw new MissingRowIdException(field);
    }
    const context: RowContext = { groupBinding, rowIndex, rowId };
    const hidden =
      node.hidden ||
      (item.hiddenRow !== undefined &&
        evalExpr(
          item.hiddenRow,
          withCurrentDataModelPath(inputs.hiddenDataSources, getCurrentDataModelPath([...node.rowContexts, context])),
          {
            returnType: ExprVal.Boolean,
            defaultValue: false,
            errorIntroText: `Hidden row expression for ${node.id} failed`,
          },
        ));
    return [{ context, hidden, visibility: visibility | (state.validation.rowMasks[rowId] ?? 0), validations }];
  });
}

function getRowMask(row: RepeatingGroupRowValidations, mask: NodeVisibility): number {
  if (typeof mask === 'number') {
    return mask;
  }
  return row.visibility | (mask === 'showAll' ? ValidationMask.Backend | ValidationMask.CustomBackend : 0);
}

/** Takes the same arguments as `getNodeRefValidations`, plus a row index that limits the result to one row. */
export function getRepeatingGroupRowValidations(
  derived: DerivedValidationState,
  nodeId: string,
  mask: NodeVisibility,
  severity?: ValidationSeverity,
  includeHidden = false,
  rowIndex?: number,
): NodeRefValidation[] {
  const node = derived.nodeById.get(nodeId);
  if (!node) {
    return [];
  }
  return (derived.repeatingGroupRowsByNode.get(nodeId) ?? []).flatMap((row) => {
    if ((!includeHidden && row.hidden) || (rowIndex !== undefined && row.context.rowIndex !== rowIndex)) {
      return [];
    }
    return selectValidations(row.validations, getRowMask(row, mask), severity).map((validation) => ({
      ...validation,
      baseComponentId: node.baseId,
      nodeId,
      repeatingGroupRow: row.context,
    }));
  });
}

export function hasRepeatingGroupRowErrors(derived: DerivedValidationState, rowId: string, mask: NodeVisibility) {
  for (const rows of derived.repeatingGroupRowsByNode.values()) {
    const row = rows.find(({ context }) => context.rowId === rowId);
    if (row && !row.hidden && selectValidations(row.validations, getRowMask(row, mask), 'error').length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * A row-object message belongs to the group, so navigating to it needs a form field in that row to reveal and focus.
 * Returns the first visible one, or undefined when the row has none.
 */
export function getRepeatingGroupRowFocusTarget(
  derived: DerivedValidationState,
  layoutLookups: LayoutLookups,
  groupNodeId: string,
  row: RowContext,
): string | undefined {
  return getDerivedNodeDescendantIds(derived.nodes, groupNodeId, row.rowIndex).find((id) => {
    const node = derived.nodeById.get(id);
    if (!node || node.hidden || !node.isValid || !node.rowIds.includes(row.rowId)) {
      return false;
    }
    const item = layoutLookups.getComponent(node.baseId);
    return (
      !('renderAsSummary' in item && item.renderAsSummary) && getComponentDef(item.type).category === CompCategory.Form
    );
  });
}
