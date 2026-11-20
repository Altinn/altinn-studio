import type { ValidLanguageKey } from '@app/language';
import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { type ComponentValidation, FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { readDataFromState } from 'src/features/validation/nodeValidation/readDataFromState';
import { evalRequiredValidationTextResourceBindings } from 'src/features/validation/nodeValidation/requiredValidationTextResourceBindings';
import { getFieldNameKey } from 'src/utils/formComponentUtils';
import type { ComponentValidationContext } from 'src/layout';
import type { CompTypes } from 'src/layout/layout';

export function validateEmptyFieldAllBindings<T extends CompTypes>(
  ctx: ComponentValidationContext<T>,
  defaultText: ValidLanguageKey = 'form_filler.error_required',
): ComponentValidation[] {
  const component = ctx.component;
  const required =
    'required' in component
      ? evalExpr(component.required, ctx.expressionDataSources, {
          returnType: ExprVal.Boolean,
          defaultValue: false,
        })
      : false;
  const dataModelBindings = ctx.component.dataModelBindings;
  if (!required || !dataModelBindings) {
    return [];
  }

  const validations: ComponentValidation[] = [];
  for (const [bindingKey, reference] of Object.entries(dataModelBindings as Record<string, IDataModelReference>)) {
    const data = readDataFromState(ctx.formState, reference);
    const asString =
      typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean' ? String(data) : '';

    if (asString.length === 0) {
      const trb = evalRequiredValidationTextResourceBindings(ctx, bindingKey);
      const key = trb && 'requiredValidation' in trb && trb.requiredValidation ? trb.requiredValidation : defaultText;
      const fieldReference = { key: getFieldNameKey(trb, bindingKey), makeLowerCase: true };

      validations.push({
        source: FrontendValidationSource.EmptyField,
        bindingKey,
        message: { key, params: [fieldReference] },
        severity: 'error',
        category: ValidationMask.Required,
      });
    }
  }

  return validations;
}

export function validateEmptyFieldOnlyOneBinding<T extends CompTypes, Binding extends string>(
  ctx: ComponentValidationContext<T>,
  binding: Binding,
  defaultText: ValidLanguageKey = 'form_filler.error_required',
): ComponentValidation[] {
  const component = ctx.component;
  const required =
    'required' in component
      ? evalExpr(component.required, ctx.expressionDataSources, {
          returnType: ExprVal.Boolean,
          defaultValue: false,
        })
      : false;
  const reference = ctx.component.dataModelBindings?.[binding as string] as IDataModelReference | undefined;
  if (!required || !reference) {
    return [];
  }

  const data = readDataFromState(ctx.formState, reference);
  const asString =
    typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean' ? String(data) : '';

  if (asString.length > 0) {
    return [];
  }

  const trb = evalRequiredValidationTextResourceBindings(ctx, binding);
  const key = trb && 'requiredValidation' in trb && trb.requiredValidation ? trb.requiredValidation : defaultText;
  const fieldReference = { key: getFieldNameKey(trb, binding), makeLowerCase: true };

  return [
    {
      source: FrontendValidationSource.EmptyField,
      bindingKey: binding,
      message: { key, params: [fieldReference] },
      severity: 'error',
      category: ValidationMask.Required,
    },
  ];
}
