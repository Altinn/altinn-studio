import { deriveInvalidDataValidations } from 'src/features/validation/invalidDataValidation/InvalidDataValidation';

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
