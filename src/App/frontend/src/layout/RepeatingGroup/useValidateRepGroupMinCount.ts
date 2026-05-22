import dot from 'dot-object';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import type { ComponentValidation } from 'src/features/validation';
import type { ComponentValidationContext } from 'src/layout';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IDataModelBindings } from 'src/layout/layout';

export function validateRepGroupMinCount(minCount: number, visibleRows: number): ComponentValidation | undefined {
  if (visibleRows >= minCount) {
    return undefined;
  }

  return {
    message: { key: 'validation_errors.minItems', params: [minCount] },
    severity: 'error',
    source: FrontendValidationSource.Component,
    // Treat visibility of minCount the same as required to prevent showing an error immediately
    category: ValidationMask.Required,
  };
}

function getVisibleRows(ctx: ComponentValidationContext<'RepeatingGroup'>): number {
  const groupBinding = (ctx.component.dataModelBindings as IDataModelBindings<'RepeatingGroup'> | undefined)?.group;
  const rows = groupBinding
    ? dot.pick(groupBinding.field, ctx.formState.data.models[groupBinding.dataType]?.debouncedCurrentData)
    : undefined;
  if (!Array.isArray(rows) || !groupBinding) {
    return 0;
  }

  let visibleRows = 0;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const currentDataModelPath: IDataModelReference = {
      dataType: groupBinding.dataType,
      field: `${groupBinding.field}[${rowIndex}]`,
    };
    const expressionDataSources = {
      ...ctx.expressionDataSources,
      currentDataModelPath,
      context: {
        ...ctx.expressionDataSources.context,
        currentDataModelPath: () => currentDataModelPath,
      },
    };
    const hidden = evalExpr(ctx.component.hiddenRow, expressionDataSources, {
      returnType: ExprVal.Boolean,
      defaultValue: false,
    });
    if (!hidden) {
      visibleRows += 1;
    }
  }

  return visibleRows;
}

export function validateRepGroupMinCountForNode(
  ctx: ComponentValidationContext<'RepeatingGroup'>,
): ComponentValidation[] {
  const validation = validateRepGroupMinCount(
    evalExpr(ctx.component.minCount, ctx.expressionDataSources, {
      returnType: ExprVal.Number,
      defaultValue: 0,
    }) as number,
    getVisibleRows(ctx),
  );
  return validation ? [validation] : [];
}
