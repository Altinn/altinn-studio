import { expect, expectTypeOf, it } from 'vitest';

import { ExprVal } from './expression-types';
import { Expressions } from './generated/expressions.generated';
import type { ExpressionDescriptor } from './expression-descriptor';
import type { ComponentTypeConfigs } from './generated/components.generated';

it('generates descriptors for every registered component', () => {
  expectTypeOf<keyof typeof Expressions>().toEqualTypeOf<keyof ComponentTypeConfigs>();
});

it('preserves the current runtime fallbacks independently of schema defaults', () => {
  expect(Expressions.Datepicker.minDate.defaultValue).toBe('');
  expect(Expressions.Datepicker.maxDate.defaultValue).toBe('');
  expect(Expressions.Number.value.defaultValue).toBeNaN();
  expect(Expressions.FileUpload.maxNumberOfAttachments.defaultValue).toBe(Infinity);
  expect(Expressions.Input.formatting.number.decimalSeparator.defaultValue).toBe('.');
  expect(Expressions.Input.formatting.number.thousandSeparator.returnType).toBe(ExprVal.Any);
  expect(Expressions.Input.formatting.number.thousandSeparator.defaultValue).toBe(false);
  expect(Expressions.Dropdown.optionFilter.defaultValue).toBe(true);
  expect(Expressions.RepeatingGroup.edit.saveButton).toMatchObject({
    returnType: ExprVal.Boolean,
    defaultValue: true,
  });
  expectTypeOf(Expressions.Input.required).toExtend<ExpressionDescriptor<ExprVal.Boolean>>();
});
