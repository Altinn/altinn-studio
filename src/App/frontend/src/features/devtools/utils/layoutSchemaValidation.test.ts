import layoutSchema from '@app/layout-contract/schemas/json/layout/layout.schema.v1.json';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ErrorObject } from 'ajv';
import type { JSONSchema7 } from 'json-schema';

import {
  createLayoutValidator,
  EMPTY_SCHEMA_NAME,
  formatLayoutSchemaValidationError,
  LAYOUT_SCHEMA_NAME,
} from 'src/features/devtools/utils/layoutSchemaValidation';
import { getComponentDef } from 'src/layout';
import type { CompExternalExact } from 'src/layout/layout';
import type { ValidateFunc } from 'src/utils/layout/validation/LayoutValidationContext';

const schema = layoutSchema as unknown as JSONSchema7;
const componentPointer = '#/definitions/AnyComponent';
const input = {
  id: 'input',
  type: 'Input',
  dataModelBindings: { simpleBinding: { dataType: 'model', field: 'name' } },
};
const repeatingGroup = {
  id: 'group',
  type: 'RepeatingGroup',
  children: ['input'],
  dataModelBindings: { group: { dataType: 'model', field: 'rows' } },
};

function makeValidate(schemaToValidate: JSONSchema7, previousOptions = false): ValidateFunc {
  const validator = createLayoutValidator(schemaToValidate);
  if (previousOptions) {
    // Restore the previous AJV defaults before any layout schema is compiled.
    validator.opts.inlineRefs = true;
    validator.opts.code.optimize = 1;
  }
  return (pointer, data) => {
    const valid = validator.validate(pointer?.length ? `${LAYOUT_SCHEMA_NAME}${pointer}` : EMPTY_SCHEMA_NAME, data);
    return valid ? undefined : (validator.errors ?? undefined);
  };
}

function formatErrors(errors: ErrorObject[] | undefined) {
  return [...new Set(errors?.map(formatLayoutSchemaValidationError).filter((message) => message !== null))];
}

describe('layout schema compiler with the generated schema', () => {
  let originalValidate: ValidateFunc;
  let validate: ValidateFunc;

  beforeAll(() => {
    originalValidate = makeValidate(schema, true);
    validate = makeValidate(schema);
  });

  it.each(layoutSchema.definitions.AnyComponent.properties.type.enum)(
    'preserves errors for %s components with missing required properties',
    (type) => {
      const data = { type };
      const originalErrors = originalValidate(componentPointer, data);
      const errors = validate(componentPointer, data);
      expect(originalErrors).toBeDefined();
      expect(errors).toBeDefined();
      expect(errors).toEqual(originalErrors);
      expect(formatErrors(errors)).toEqual(formatErrors(originalErrors));
    },
  );

  it.each([
    ['valid input', input, true],
    ['valid expressions', { ...input, hidden: ['equals', 1, 1], required: ['dataModel', 'required'] }, true],
    ['valid repeating group', repeatingGroup, true],
    [
      'valid grid',
      { id: 'grid', type: 'Grid', rows: [{ cells: [{ text: 'Text' }, null, { component: 'input' }] }] },
      true,
    ],
    ['missing id', { ...input, id: undefined }, false],
    ['invalid id pattern', { ...input, id: 'input-1' }, false],
    ['invalid common field', { ...input, grid: { xs: 'wide' } }, false],
    ['unknown property', { ...input, unknownProperty: true }, false],
    ['legacy string binding', { ...input, dataModelBindings: { simpleBinding: 'name' } }, true],
    ['invalid binding', { ...input, dataModelBindings: { simpleBinding: 123 } }, false],
    ['missing binding field', { ...input, dataModelBindings: { simpleBinding: { dataType: 'model' } } }, false],
    ['invalid expression value', { ...input, hidden: 'sometimes' }, false],
    ['invalid text expression', { ...input, textResourceBindings: { title: 123 } }, false],
    ['invalid input option', { ...input, variant: 'future' }, false],
    ['invalid repeating group minimum', { ...repeatingGroup, minCount: -1 }, false],
    ['invalid repeating children', { ...repeatingGroup, children: [1] }, false],
    ['invalid grid rows', { id: 'grid', type: 'Grid', rows: 'invalid' }, false],
    [
      'invalid grid cells',
      { id: 'grid', type: 'Grid', rows: [{ cells: [{ text: 123 }, { unexpected: true }] }] },
      false,
    ],
    ['unknown component type', { id: 'unknown', type: 'FutureComponent' }, false],
    ['missing component type', { id: 'input' }, false],
    ['invalid component type', { id: 'input', type: 123 }, false],
    ['null component', null, false],
    ['array component', [], false],
    ['primitive component', 'Input', false],
  ])('preserves validity and formatted errors for %s', (_name, data, expectedValid) => {
    const originalErrors = originalValidate(componentPointer, data);
    const errors = validate(componentPointer, data);
    expect(originalErrors === undefined).toBe(expectedValid);
    expect(errors === undefined).toBe(expectedValid);
    expect(errors).toEqual(originalErrors);
    expect(formatErrors(errors)).toEqual(formatErrors(originalErrors));
  });

  it.each([
    ['#/definitions/GridCellText', { text: 'Text' }],
    ['#/definitions/GridCellText', { text: 123 }],
    ['#/definitions/GridCellLabelFrom', { labelFrom: 123 }],
    ['#/definitions/GridComponentRef', { component: 123 }],
    [null, { unexpected: true }],
    ['', { unexpected: true }],
  ])('preserves validation of explicit cell pointer %s', (pointer, data) => {
    expect(validate(pointer, data)).toEqual(originalValidate(pointer, data));
  });

  it('preserves Grid cell filtering and rewritten error paths', () => {
    const grid = getComponentDef('Grid');
    const data = {
      id: 'grid',
      type: 'Grid',
      rows: [{ cells: [{ text: 123 }, { labelFrom: 123 }, { component: 123 }, { unexpected: true }, null] }],
    } as unknown as CompExternalExact<'Grid'>;
    const originalErrors = grid.validateLayoutConfig(data, originalValidate);
    const errors = grid.validateLayoutConfig(data, validate);

    expect(errors).toBeDefined();
    expect(errors).toEqual(originalErrors);
    expect(formatErrors(errors)).toEqual(formatErrors(originalErrors));
    expect(errors?.some((error) => error.instancePath === '/rows/0/cells/0/text')).toBe(true);
  });
});

describe('layout schema compiler diagnostics', () => {
  it.each([
    ['minLength', { type: 'string', minLength: 3 }, 'a'],
    ['maxLength', { type: 'string', maxLength: 1 }, 'long'],
    ['minItems', { type: 'array', minItems: 2 }, []],
    ['maxItems', { type: 'array', maxItems: 1 }, [1, 2]],
    ['uniqueItems', { type: 'array', uniqueItems: true }, [1, 1]],
    ['multipleOf', { type: 'number', multipleOf: 2 }, 3],
    ['minProperties', { type: 'object', minProperties: 2 }, {}],
    ['maxProperties', { type: 'object', maxProperties: 1 }, { a: 1, b: 2 }],
    ['not', { not: { type: 'string' } }, 'text'],
  ] satisfies [string, JSONSchema7, unknown][])(
    'preserves schema paths and formatted errors for %s',
    (keyword, fieldSchema, field) => {
      const customSchema: JSONSchema7 = {
        $ref: componentPointer,
        definitions: {
          AnyComponent: { type: 'object', properties: { field: { $ref: '#/definitions/Field' } } },
          Field: fieldSchema,
        },
      };
      const originalErrors = makeValidate(customSchema, true)(componentPointer, { field });
      const errors = makeValidate(customSchema)(componentPointer, { field });

      expect(originalErrors?.some((error) => error.keyword === keyword)).toBe(true);
      expect(errors).toEqual(originalErrors);
      expect(formatErrors(errors)).toEqual(formatErrors(originalErrors));
    },
  );
});
