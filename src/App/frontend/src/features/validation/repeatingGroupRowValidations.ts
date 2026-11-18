import dot from 'dot-object';
import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { withCurrentDataModelPath } from 'src/features/validation/deriveNodes';
import { ValidationMask } from 'src/features/validation/index';
import { selectValidations } from 'src/features/validation/utils';
import { getCurrentDataModelPath, getIndexedDataModelReference } from 'src/utils/layout/rowContext';
import type { FormStoreState } from 'src/features/form/FormContext';
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
  const restriction = scope?.nodeId === node.id ? scope.restriction : undefined;
  const indexes = restriction === undefined ? rows.keys() : [restriction];
  return Array.from(indexes).flatMap((rowIndex) => {
    if (rowIndex < 0 || rowIndex >= rows.length) {
      return [];
    }
    const row: unknown = rows[rowIndex];
    const field = `${groupBinding.field}[${rowIndex}]`;
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

export function getRepeatingGroupRowValidations(
  derived: DerivedValidationState,
  nodeId: string,
  mask: NodeVisibility,
  restriction?: number,
  severity?: ValidationSeverity,
  includeHidden = false,
): NodeRefValidation[] {
  const node = derived.nodeById.get(nodeId);
  if (!node) {
    return [];
  }
  return (derived.repeatingGroupRowsByNode.get(nodeId) ?? []).flatMap((row) => {
    if ((!includeHidden && row.hidden) || (restriction !== undefined && row.context.rowIndex !== restriction)) {
      return [];
    }
    const effectiveMask =
      typeof mask === 'number'
        ? mask
        : row.visibility | (mask === 'showAll' ? ValidationMask.Backend | ValidationMask.CustomBackend : 0);
    return selectValidations(row.validations, effectiveMask, severity).map((validation) => ({
      ...validation,
      baseComponentId: node.baseId,
      nodeId,
      repeatingGroupRow: row.context,
    }));
  });
}
