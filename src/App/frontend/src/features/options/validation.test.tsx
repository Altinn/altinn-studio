import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';
import type { JSONSchema7 } from 'json-schema';

import { SchemaLookupTool } from 'src/features/datamodel/SchemaLookupTool';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { validateOptionsDataModelBindings } from 'src/features/options/validation';
import { validateSimpleBindingWithOptionalGroup } from 'src/features/saveToGroup/layoutValidation';
import { Checkboxes } from 'src/layout/Checkboxes';
import { Dropdown } from 'src/layout/Dropdown';
import { LikertItem } from 'src/layout/LikertItem';
import { MultipleSelect } from 'src/layout/MultipleSelect';
import { RadioButtons } from 'src/layout/RadioButtons';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { IDataModelBindings } from 'src/layout/layout';

const reference = (field: string): IDataModelReference => ({ field, dataType: 'model' });
const bindings: IDataModelBindings<'Checkboxes'> = {
  simpleBinding: reference('Value'),
  label: reference('Label'),
  metadata: reference('Metadata'),
};
const layoutLookups = makeLayoutLookups(
  {
    page: [{ id: 'choice', type: 'Checkboxes', dataModelBindings: bindings }],
  },
  {},
);

function makeLookup(label: JSONSchema7, metadata: JSONSchema7 = { type: 'string' }) {
  const tool = new SchemaLookupTool(
    {
      type: 'object',
      properties: {
        Value: { type: 'string' },
        Label: label,
        Metadata: metadata,
        Group: {
          type: 'array',
          items: { type: 'object', properties: { Value: { type: 'string' }, Label: label } },
        },
      },
      definitions: { Text: { type: 'string' } },
    },
    '',
  );
  return (binding: IDataModelReference) => tool.getSchemaForPath(binding.field);
}

function validate(label: JSONSchema7, valueType: OptionsValueType, metadata?: JSONSchema7) {
  return validateOptionsDataModelBindings('choice', bindings, makeLookup(label, metadata), layoutLookups, valueType);
}

const initialValidationSetting = window.forceLayoutPropertiesValidation;
beforeEach(() => {
  window.forceLayoutPropertiesValidation = undefined;
});
afterEach(() => {
  window.forceLayoutPropertiesValidation = initialValidationSetting;
  vi.restoreAllMocks();
});

describe('options binding validation', () => {
  it('accepts optional bindings being absent and schemas not yet loaded', () => {
    expect(validateOptionsDataModelBindings('choice', undefined, undefined, layoutLookups, 'multi')).toEqual([]);
    expect(validateOptionsDataModelBindings('choice', bindings, undefined, layoutLookups, 'multi')).toEqual([]);
    expect(
      validateOptionsDataModelBindings(
        'choice',
        { simpleBinding: bindings.simpleBinding },
        makeLookup({ type: 'string' }),
        layoutLookups,
        'multi',
      ),
    ).toEqual([]);
  });

  it('accepts string labels for single selection', () => {
    expect(validate({ type: 'string' }, 'single')).toEqual([]);
  });

  it('rejects array labels for single selection', () => {
    expect(validate({ type: 'array', items: { type: 'string' } }, 'single')).toEqual([
      expect.stringContaining('label-datamodellbindingen'),
    ]);
  });

  it('accepts string arrays for multiple selection', () => {
    expect(validate({ type: 'array', items: { type: 'string' } }, 'multi')).toEqual([]);
  });

  it('resolves references and nullable string array items', () => {
    expect(validate({ type: 'array', items: { $ref: '#/definitions/Text' } }, 'multi')).toEqual([]);
    expect(validate({ type: 'array', items: { type: ['string', 'null'] } }, 'multi')).toEqual([]);
  });

  it('rejects scalar labels for multiple selection', () => {
    expect(validate({ type: 'string' }, 'multi')).toEqual([expect.stringContaining('label-datamodellbindingen')]);
  });

  it.each<JSONSchema7>([
    { type: 'array', items: { type: 'number' } },
    { type: 'array', items: { type: 'object' } },
    { type: 'array' },
  ])('rejects arrays without string items: %j', (schema) => {
    expect(validate(schema, 'multi')).toEqual([expect.stringContaining('label')]);
  });

  it.each<JSONSchema7>([{ type: 'number' }, { type: 'array', items: { type: 'string' } }])(
    'rejects non-string metadata: %j',
    (schema) => {
      expect(validate({ type: 'string' }, 'single', schema)).toEqual([
        expect.stringContaining('metadata-datamodellbindingen'),
      ]);
    },
  );

  it.each(['label', 'metadata'] as const)('reports missing fields for %s', (key) => {
    const errors = validateOptionsDataModelBindings(
      'choice',
      { ...bindings, [key]: reference('Missing') },
      makeLookup({ type: 'array', items: { type: 'string' } }),
      layoutLookups,
      'multi',
    );
    expect(errors).toEqual([expect.stringContaining('Missing')]);
  });

  it('honours disabled layout validation', () => {
    window.forceLayoutPropertiesValidation = 'off';
    try {
      expect(validate({ type: 'number' }, 'multi', { type: 'number' })).toEqual([]);
    } finally {
      window.forceLayoutPropertiesValidation = undefined;
    }
  });
});

describe('component binding validators', () => {
  it('checks label and metadata bindings in LikertItem', () => {
    const lookupBinding = makeLookup({ type: 'number' }, { type: 'number' });
    const likertLookups = {
      ...layoutLookups,
      allComponents: {
        ...layoutLookups.allComponents,
        likert: {
          id: 'likert',
          type: 'Likert' as const,
          dataModelBindings: { questions: reference('Group'), answer: reference('Group.Value') },
        },
      },
      componentToChildren: { ...layoutLookups.componentToChildren, likert: ['choice'] },
      componentToParent: { ...layoutLookups.componentToParent, choice: { type: 'node' as const, id: 'likert' } },
    };
    const result = new LikertItem().validateDataModelBindings(
      'choice',
      {
        simpleBinding: reference('Group.Value'),
        label: reference('Group.Label'),
        metadata: reference('Metadata'),
      },
      { lookupBinding, layoutLookups: likertLookups },
    );
    expect(result).toEqual([
      expect.stringContaining('metadata-datamodellbindingen'),
      expect.stringContaining('label-datamodellbindingen'),
    ]);
  });

  it.each([
    ['Dropdown', new Dropdown()],
    ['RadioButtons', new RadioButtons()],
    ['Checkboxes', new Checkboxes()],
    ['MultipleSelect', new MultipleSelect()],
  ] as const)('checks label and metadata bindings in %s', (_, component) => {
    const lookupBinding = makeLookup({ type: 'number' }, { type: 'number' });
    const result = component.validateDataModelBindings('choice', bindings, { lookupBinding, layoutLookups });
    expect(result).toEqual([
      expect.stringContaining('metadata-datamodellbindingen'),
      expect.stringContaining('label-datamodellbindingen'),
    ]);
  });

  it('rejects grouped labels bound to a different data model despite matching field paths and types', () => {
    const lookupBinding = makeLookup({ type: 'string' });
    const result = validateSimpleBindingWithOptionalGroup(
      'choice',
      {
        group: reference('Group'),
        simpleBinding: reference('Group.Value'),
        label: { field: 'Group.Label', dataType: 'otherModel' },
      },
      { lookupBinding, layoutLookups },
    );
    expect(result).toEqual(['label must use the group binding data type']);
  });

  it.each([
    [{ type: 'string' }, []],
    [{ type: 'array', items: { type: 'string' } }, [expect.stringContaining('label-datamodellbindingen')]],
  ] satisfies [JSONSchema7, unknown[]][])(
    'validates labels as scalar strings inside group rows: %j',
    (schema, errors) => {
      const lookupBinding = makeLookup(schema);
      const result = validateSimpleBindingWithOptionalGroup(
        'choice',
        {
          group: reference('Group'),
          simpleBinding: reference('Group.Value'),
          label: reference('Group.Label'),
        },
        { lookupBinding, layoutLookups },
      );
      expect(result).toEqual(errors);
    },
  );
});
