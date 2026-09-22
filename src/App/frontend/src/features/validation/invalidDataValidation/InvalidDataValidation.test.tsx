import { ValidationMask } from 'src/features/validation';
import { deriveInvalidDataValidations } from 'src/features/validation/invalidDataValidation/InvalidDataValidation';
import { getVisibilityMask, selectValidations } from 'src/features/validation/utils';
import type { FieldValidation } from 'src/features/validation';

describe('deriveInvalidDataValidations', () => {
  it('creates field validations for scalar invalid values', () => {
    const validations = deriveInvalidDataValidations({
      invalidData: {
        person: {
          age: 'abc',
          contact: {
            phone: 'not-a-number',
          },
          empty: {},
        },
      },
      dataElementId: 'data-element-id',
    });

    expect(validations).toEqual({
      'person.age': [
        expect.objectContaining({
          field: 'person.age',
          dataElementId: 'data-element-id',
          severity: 'error',
          category: ValidationMask.Invalid,
        }),
      ],
      'person.contact.phone': [
        expect.objectContaining({
          field: 'person.contact.phone',
          dataElementId: 'data-element-id',
          severity: 'error',
        }),
      ],
    });
  });

  it('keeps configured Invalid and Schema visibility separate', () => {
    const invalid = deriveInvalidDataValidations({ invalidData: { count: 'abc' }, dataElementId: 'book' }).count;
    const schema: FieldValidation = { ...invalid[0], field: 'year', category: ValidationMask.Schema };
    const validations = [...invalid, schema];

    expect(selectValidations(validations, getVisibilityMask(['Invalid']))).toEqual(invalid);
    expect(selectValidations(validations, getVisibilityMask(['Schema']))).toEqual([schema]);
    expect(selectValidations(validations, getVisibilityMask(['Schema', 'Invalid']))).toEqual(validations);
    expect(selectValidations(validations, ValidationMask.All)).toEqual(validations);
    expect(selectValidations(validations, ValidationMask.AllExceptRequired)).toEqual(validations);
  });

  it('ignores nested objects and arrays without scalar invalid values', () => {
    const validations = deriveInvalidDataValidations({
      invalidData: {
        person: {
          address: {},
          phones: [],
        },
      },
      dataElementId: 'data-element-id',
    });

    expect(validations).toEqual({});
  });
});
