import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';

import { evaluateDescriptor } from 'src/features/expressions/evaluateDescriptor';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { ComponentValidationContext } from 'src/layout';
import type { CompTypes } from 'src/layout/layout';

/** Resolves only the text bindings used by an actual required-field error. */
export function evalRequiredValidationTextResourceBindings<T extends CompTypes>(
  ctx: ComponentValidationContext<T>,
  fieldKey?: string,
): Record<string, string | undefined> | undefined {
  const bindings = ctx.component.textResourceBindings as
    Record<string, ExprValToActualOrExpr<ExprVal.String>> | undefined;
  if (!bindings) {
    return undefined;
  }

  const evalText = (key: 'requiredValidation' | 'shortName' | 'title') =>
    key in bindings
      ? evaluateDescriptor(
          bindings[key],
          key === 'title' ? CommonExpressions.TRBLabel.title : CommonExpressions.TRBFormComp[key],
          ctx.expressionDataSources,
          ctx.baseComponentId,
        )
      : undefined;
  const requiredValidation = evalText('requiredValidation');
  if (fieldKey && fieldKey !== 'simpleBinding') {
    return { requiredValidation };
  }

  const shortName = evalText('shortName');
  return { requiredValidation, shortName, title: shortName ? undefined : evalText('title') };
}
