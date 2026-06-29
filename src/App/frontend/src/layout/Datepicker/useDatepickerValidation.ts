import { getDateConstraint, getDateFormat, getDatepickerFormat, strictParseISO } from '@app/form-component';
import { isAfter, isBefore } from 'date-fns';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { type ComponentValidation, FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { readDataFromState } from 'src/features/validation/nodeValidation/readDataFromState';
import type { ComponentValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export function validateDatepicker(ctx: ComponentValidationContext<'Datepicker'>): ComponentValidation[] {
  const bindings = ctx.component.dataModelBindings as IDataModelBindings<'Datepicker'> | undefined;
  const data = readDataFromState(ctx.formState, bindings?.simpleBinding);
  const minDate = getDateConstraint(
    evalExpr(ctx.component.minDate, ctx.expressionDataSources, {
      returnType: ExprVal.String,
      defaultValue: '',
    }),
    'min',
  );
  const maxDate = getDateConstraint(
    evalExpr(ctx.component.maxDate, ctx.expressionDataSources, {
      returnType: ExprVal.String,
      defaultValue: '',
    }),
    'max',
  );
  const format = getDateFormat(
    evalExpr(ctx.component.format, ctx.expressionDataSources, {
      returnType: ExprVal.String,
      defaultValue: '',
    }) as string,
    ctx.expressionDataSources.context.currentLanguage(),
  );
  const dataAsString = typeof data === 'string' || typeof data === 'number' ? String(data) : undefined;
  if (!dataAsString) {
    return [];
  }

  const datePickerFormat = getDatepickerFormat(format).toUpperCase();

  const validations: ComponentValidation[] = [];
  const date = strictParseISO(dataAsString);
  if (!date) {
    validations.push({
      message: { key: 'date_picker.invalid_date_message', params: [datePickerFormat] },
      severity: 'error',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Component,
    });
  }

  if (date && isBefore(date, minDate)) {
    validations.push({
      message: { key: 'date_picker.min_date_exeeded' },
      severity: 'error',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Component,
    });
  } else if (date && isAfter(date, maxDate)) {
    validations.push({
      message: { key: 'date_picker.max_date_exeeded' },
      severity: 'error',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Component,
    });
  }

  return validations;
}
