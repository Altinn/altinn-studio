import type { JSONSchema7 } from 'json-schema';

import { CustomReact } from 'src/layout/CustomReact';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

describe('CustomReact.validateDataModelBindings', () => {
  const layoutLookups = {
    componentToParent: {},
    allComponents: {},
    componentToChildren: {},
  } as unknown as LayoutLookups;

  // Unit tests turn layout validation off by default
  beforeEach(() => {
    window.forceLayoutPropertiesValidation = 'on';
  });
  afterEach(() => {
    window.forceLayoutPropertiesValidation = 'off';
  });

  function validate(schemas: Record<string, JSONSchema7>) {
    const bindings = Object.fromEntries(
      Object.keys(schemas).map((field) => [field, { field, dataType: 'model' }]),
    ) as IDataModelBindings<'CustomReact'>;
    const lookupBinding: DataModelBindingValidationContext['lookupBinding'] = (reference) => [
      schemas[reference.field],
      undefined,
    ];

    return new CustomReact().validateDataModelBindings('component', bindings, { lookupBinding, layoutLookups });
  }

  it('accepts values and lists of strings', () => {
    expect(
      validate({
        text: { type: 'string' },
        amount: { type: 'number' },
        count: { type: 'integer' },
        accepted: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
      }),
    ).toEqual([]);
  });

  it('rejects lists that do not contain strings', () => {
    expect(validate({ numbers: { type: 'array', items: { type: 'number' } }, untyped: { type: 'array' } })).toEqual([
      'numbers-datamodellbindingen peker mot en liste som ikke er en liste med tekst i datamodellen, men CustomReact støtter bare lister med tekst',
      'untyped-datamodellbindingen peker mot en liste som ikke er en liste med tekst i datamodellen, men CustomReact støtter bare lister med tekst',
    ]);
  });

  it('rejects objects', () => {
    expect(validate({ person: { type: 'object' } })).toEqual([
      'person-datamodellbindingen peker mot en type definert som object i datamodellen, men burde være en av string, number, integer, boolean, array',
    ]);
  });
});
