import { isAfter, isBefore } from 'date-fns';

import { getDateConstraint, getDateFormat, strictParseISO } from 'src/app-components/Datepicker/utils/dateHelpers';
import { FD } from 'src/features/formData/FormDataWrite';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { type ComponentValidation, FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { getDatepickerFormat } from 'src/utils/dateUtils';
import { useDataModelBindingsFor, useExternalItem } from 'src/utils/layout/hooks';

export function useDatepickerValidation(baseComponentId: string): ComponentValidation[] {
  const currentLanguage = useCurrentLanguage();
  const field = useDataModelBindingsFor(baseComponentId, 'Datepicker')?.simpleBinding;
  const component = useExternalItem(baseComponentId, 'Datepicker');
  const data = FD.useDebouncedPick(field);
  const minDate = getDateConstraint(component?.minDate, 'min');
  const maxDate = getDateConstraint(component?.maxDate, 'max');
  const format = getDateFormat(component?.format, currentLanguage);
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
