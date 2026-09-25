import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';
import dot from 'dot-object';

import { evaluateDescriptor } from 'src/features/expressions/evaluateDescriptor';
import { toRelativePath } from 'src/features/saveToGroup/useSaveToGroup';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { readDataFromState } from 'src/features/validation/nodeValidation/readDataFromState';
import { getFieldNameKey } from 'src/utils/formComponentUtils';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { ComponentValidation } from 'src/features/validation';
import type { ComponentValidationContext } from 'src/layout';
import type { CompTypes, IDataModelBindings } from 'src/layout/layout';

export function validateGroupIsEmpty<T extends Extract<CompTypes, 'Checkboxes' | 'MultipleSelect' | 'List'>>(
  ctx: ComponentValidationContext<T>,
): ComponentValidation[] {
  const component = ctx.component as unknown as {
    required?: unknown;
    textResourceBindings?: Record<string, unknown>;
  };
  const required = evaluateDescriptor(
    component.required as ExprValToActualOrExpr<ExprVal.Boolean> | undefined,
    CommonExpressions.FormComponentProps.required,
    ctx.expressionDataSources,
  );
  const dataModelBindings = (ctx.component as { dataModelBindings?: IDataModelBindings<T> }).dataModelBindings;
  const bindings = component.textResourceBindings;
  const textResourceBindings = bindings
    ? {
        requiredValidation: evaluateDescriptor(
          bindings.requiredValidation as ExprValToActualOrExpr<ExprVal.String> | undefined,
          CommonExpressions.TRBFormComp.requiredValidation,
          ctx.expressionDataSources,
        ),
        shortName: evaluateDescriptor(
          bindings.shortName as ExprValToActualOrExpr<ExprVal.String> | undefined,
          CommonExpressions.TRBFormComp.shortName,
          ctx.expressionDataSources,
        ),
        title: evaluateDescriptor(
          bindings.title as ExprValToActualOrExpr<ExprVal.String> | undefined,
          CommonExpressions.TRBLabel.title,
          ctx.expressionDataSources,
        ),
      }
    : undefined;
  if (!required || !dataModelBindings) {
    return [];
  }

  let hasErrors = false;
  if ('group' in dataModelBindings && dataModelBindings.group) {
    const groupRows = (readDataFromState(ctx.formState, dataModelBindings.group) as unknown[] | undefined) ?? [];
    if ('checked' in dataModelBindings && dataModelBindings.checked) {
      const checkedPath = toRelativePath(dataModelBindings.group, dataModelBindings.checked);
      if (checkedPath) {
        const checkedRows = groupRows.filter((row) => dot.pick(checkedPath, row));
        hasErrors = checkedRows.length === 0;
      }
    } else {
      hasErrors = groupRows.length === 0;
    }
  } else {
    for (const reference of Object.values(dataModelBindings)) {
      if (reference) {
        const data = readDataFromState(ctx.formState, reference);
        const dataAsString =
          typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean' ? String(data) : undefined;

        if (!dataAsString?.length) {
          hasErrors = true;
        }
      }
    }
  }

  if (!hasErrors) {
    return [];
  }

  return [
    {
      message: {
        key: textResourceBindings?.requiredValidation ?? 'form_filler.error_required',
        params: [{ key: getFieldNameKey(textResourceBindings, undefined), makeLowerCase: true }],
      },
      severity: 'error',
      source: FrontendValidationSource.EmptyField,
      category: ValidationMask.Required,
    },
  ];
}
