import { CG } from 'src/codegen/CG';
import { generateExpressionDescriptors } from 'src/codegen/ExpressionDescriptors';
import { ExprVal } from 'src/features/expressions/types';

it('discovers inherited, nested, array, dictionary, union and text resource expressions', () => {
  const root = new CG.obj(
    new CG.prop('edit', new CG.obj(new CG.prop('addButton', new CG.expr(ExprVal.Boolean).optional({ default: true })))),
    new CG.prop('rows', new CG.arr(new CG.obj(new CG.prop('value', new CG.expr(ExprVal.String).setFallback(''))))),
    new CG.prop('columns', new CG.obj().additionalProperties(new CG.expr(ExprVal.Boolean).setFallback(false))),
    new CG.prop('date', new CG.union(new CG.expr(ExprVal.String).setFallback(''), new CG.const('today'))),
    new CG.prop('textResourceBindings', new CG.obj().extends(CG.common('TRBFormComp'), CG.common('TRBLabel'))),
  ).extends(CG.common('FormComponentProps'));
  const result = generateExpressionDescriptors('AnyNewComponent', root);
  for (const path of [
    'required',
    'readOnly',
    'edit.addButton',
    'rows.items.value',
    'columns.additionalProperties',
    'date',
    'textResourceBindings.title',
  ]) {
    expect(result).toContain(`Invalid expression for AnyNewComponent, property ${path}`);
  }
});

it('respects local overrides of inherited expression properties', () => {
  const root = new CG.obj(new CG.prop('required', new CG.bool())).extends(CG.common('FormComponentProps'));
  const result = generateExpressionDescriptors('Prototype', root);
  expect(result).toContain('Prototype, property readOnly');
});

it('requires a declared fallback instead of guessing one', () => {
  const root = new CG.obj(new CG.prop('value', new CG.expr(ExprVal.String)));
  expect(() => generateExpressionDescriptors('Prototype', root)).toThrow(
    'Cannot generate expression descriptor for Prototype.value',
  );
});

it('keeps schema defaults separate from explicit runtime fallbacks', () => {
  const value = new CG.expr(ExprVal.String).setFallback('').optional({ default: '1900-01-01' });
  const result = generateExpressionDescriptors('Prototype', new CG.obj(new CG.prop('minDate', value)));
  expect(result).toContain('defaultValue: ""');
  expect(value.internal.optional).toEqual({ default: '1900-01-01' });
});

it('preserves non-finite and null fallbacks', () => {
  const root = new CG.obj(
    new CG.prop('number', new CG.expr(ExprVal.Number).setFallback(NaN)),
    new CG.prop('maximum', new CG.expr(ExprVal.Number).setFallback(Infinity)),
    new CG.prop('value', new CG.expr(ExprVal.Any).setFallback(null)),
  );
  const result = generateExpressionDescriptors('Prototype', root);
  expect(result).toContain('defaultValue: NaN');
  expect(result).toContain('defaultValue: Infinity');
  expect(result).toContain('defaultValue: null');
});
