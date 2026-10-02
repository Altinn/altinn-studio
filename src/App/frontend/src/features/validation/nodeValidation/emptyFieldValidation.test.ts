import * as expressions from 'src/features/expressions';
import { validateGroupIsEmpty } from 'src/features/saveToGroup/useValidateGroupIsEmpty';
import {
  validateEmptyFieldAllBindings,
  validateEmptyFieldOnlyOneBinding,
} from 'src/features/validation/nodeValidation/emptyFieldValidation';
import type { ComponentValidationContext } from 'src/layout';

const unusedTitle = ['displayValue', 'unrelated'] as const;
const unusedHelp = ['displayValue', 'help'] as const;

function context(required: boolean, value: unknown, bindings: Record<string, unknown> = { title: unusedTitle }) {
  return {
    baseComponentId: 'input',
    component: {
      id: 'input',
      type: 'Input',
      required,
      dataModelBindings: { simpleBinding: { dataType: 'model', field: 'Value' } },
      textResourceBindings: bindings,
    },
    formState: { data: { models: { model: { debouncedCurrentData: { Value: value }, invalidCurrentData: {} } } } },
    instanceData: [],
    taskId: undefined,
    expressionDataSources: { markExpressionEvaluated: vi.fn() },
  } as unknown as ComponentValidationContext<'Input'>;
}

beforeEach(() => vi.restoreAllMocks());

const validators = [
  ['all bindings', validateEmptyFieldAllBindings],
  ['one binding', (ctx: ComponentValidationContext<'Input'>) => validateEmptyFieldOnlyOneBinding(ctx, 'simpleBinding')],
] as const;

describe.each(validators)('required text evaluation: %s', (_, validate) => {
  it.each([
    [false, ''],
    [true, 'populated'],
    [true, 0],
    [true, false],
  ] as const)('does not evaluate unused labels for required=%s value=%s', (required, value) => {
    const evalSpy = vi.spyOn(expressions, 'evalExpr');
    expect(validate(context(required, value))).toEqual([]);
    expect(evalSpy.mock.calls.some(([expression]) => Object.is(expression, unusedTitle))).toBe(false);
  });

  it('preserves custom required messages and short-name precedence', () => {
    const evalSpy = vi.spyOn(expressions, 'evalExpr');
    const result = validate(
      context(true, '', {
        requiredValidation: ['concat', 'custom', '.required'],
        shortName: ['concat', 'custom', '.short'],
        title: unusedTitle,
        help: unusedHelp,
      }),
    );
    expect(result[0].message).toEqual({
      key: 'custom.required',
      params: [{ key: 'custom.short', makeLowerCase: true }],
    });
    expect(
      evalSpy.mock.calls.some(
        ([expression]) => Object.is(expression, unusedTitle) || Object.is(expression, unusedHelp),
      ),
    ).toBe(false);
  });

  it('preserves title and generic-label fallbacks with an empty custom message', () => {
    expect(
      validate(context(true, '', { requiredValidation: '', shortName: '', title: ['concat', 'custom', '.title'] }))[0]
        .message,
    ).toEqual({ key: 'form_filler.error_required', params: [{ key: 'custom.title', makeLowerCase: true }] });
    expect(validate(context(true, '', {}))[0].message).toEqual({
      key: 'form_filler.error_required',
      params: [{ key: 'validation.generic_field', makeLowerCase: true }],
    });
  });
});

it('does not resolve generic labels when a binding-specific label takes precedence', () => {
  const ctx = context(true, '', { title: unusedTitle });
  ctx.component.dataModelBindings = { customBinding: { dataType: 'model', field: 'Value' } } as never;
  const evalSpy = vi.spyOn(expressions, 'evalExpr');
  expect(validateEmptyFieldAllBindings(ctx)[0].message.params).toEqual([
    { key: 'form_filler.customBinding', makeLowerCase: true },
  ]);
  expect(evalSpy.mock.calls.some(([expression]) => Object.is(expression, unusedTitle))).toBe(false);
});

it('does not evaluate labels when required is true but there is no binding', () => {
  const ctx = context(true, '');
  Reflect.deleteProperty(ctx.component, 'dataModelBindings');
  const evalSpy = vi.spyOn(expressions, 'evalExpr');
  expect(validateEmptyFieldAllBindings(ctx)).toEqual([]);
  expect(validateEmptyFieldOnlyOneBinding(ctx, 'simpleBinding')).toEqual([]);
  expect(evalSpy.mock.calls.some(([expression]) => Object.is(expression, unusedTitle))).toBe(false);
});

it.each([
  [false, ''],
  [true, 'populated'],
] as const)('does not evaluate irrelevant group text for required=%s', (required, value) => {
  const evalSpy = vi.spyOn(expressions, 'evalExpr');
  const ctx = context(required, value);
  expect(validateGroupIsEmpty(ctx as unknown as ComponentValidationContext<'Checkboxes'>)).toEqual([]);
  expect(evalSpy.mock.calls.some(([expression]) => Object.is(expression, unusedTitle))).toBe(false);
});

it('preserves the group validator nullish custom-message fallback', () => {
  const ctx = context(true, '', { requiredValidation: '', shortName: 'group.name', title: unusedTitle });
  expect(validateGroupIsEmpty(ctx as unknown as ComponentValidationContext<'Checkboxes'>)[0].message).toEqual({
    key: '',
    params: [{ key: 'group.name', makeLowerCase: true }],
  });
});

it('uses generated descriptor fallbacks and diagnostics for invalid required-message bindings', () => {
  const logError = vi.spyOn(window, 'logError').mockImplementation(() => undefined);
  const ctx = context(true, '', {
    requiredValidation: ['invalidFunction'],
    shortName: ['invalidFunction'],
    title: ['invalidFunction'],
  });
  expect(validateEmptyFieldAllBindings(ctx)[0].message).toEqual({
    key: 'form_filler.error_required',
    params: [{ key: 'validation.generic_field', makeLowerCase: true }],
  });
  expect(logError.mock.calls.flat().join(' ')).toContain('Invalid expression for TRBFormComp');
  expect(logError.mock.calls.flat().join(' ')).toContain("component 'input'");
});

it('preserves the generated undefined fallback for an invalid group required-message binding', () => {
  vi.spyOn(window, 'logError').mockImplementation(() => undefined);
  const ctx = context(true, '', { requiredValidation: ['invalidFunction'], shortName: 'group.name' });
  expect(validateGroupIsEmpty(ctx as unknown as ComponentValidationContext<'Checkboxes'>)[0].message).toEqual({
    key: 'form_filler.error_required',
    params: [{ key: 'group.name', makeLowerCase: true }],
  });
});
