import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { Datepicker } from 'src/layout/Datepicker';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { BaseValidation } from 'src/features/validation';

describe('Datepicker validation filters', () => {
  const layoutLookups = { getComponent: () => ({}) } as unknown as LayoutLookups;
  const filters = new Datepicker().getValidationFilters('datepicker', layoutLookups);
  const applyFilters = (validations: BaseValidation[]) =>
    validations.filter((validation, index, all) => filters.every((filter) => filter(validation, index, all)));

  const invalidData: BaseValidation = {
    message: { key: 'validation_errors.pattern' },
    severity: 'error',
    source: FrontendValidationSource.InvalidData,
    category: ValidationMask.Schema,
  };
  const invalidDate: BaseValidation = {
    message: { key: 'date_picker.invalid_date_message', params: ['DD.MM.YYYY'] },
    severity: 'error',
    source: FrontendValidationSource.Component,
    category: ValidationMask.Component,
  };

  it('shows only the Datepicker message when both describe the typed text', () => {
    expect(applyFilters([invalidDate, invalidData])).toEqual([invalidDate]);
  });

  it('keeps the generic message when the Datepicker validates a date the backend wrote instead of the typed text', () => {
    expect(applyFilters([invalidData])).toEqual([invalidData]);
  });
});
