import { FD } from 'src/features/formData/FormDataWrite';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import type { ComponentValidation } from 'src/features/validation';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function useAddressValidation(node: LayoutNode<'Address'>): ComponentValidation[] {
  const dataModelBindings = useDataModelBindingsFor(node.baseId, 'Address');
  const zipCode = FD.useDebouncedPick(dataModelBindings?.zipCode);
  const houseNumber = FD.useDebouncedPick(dataModelBindings?.houseNumber);
  if (!dataModelBindings) {
    return [];
  }
  const validations: ComponentValidation[] = [];

  const zipCodeAsString = typeof zipCode === 'string' || typeof zipCode === 'number' ? String(zipCode) : undefined;

  // TODO(Validation): Add better message for the special case of 0000 or add better validation for zipCodes that the API says are invalid
  if (zipCodeAsString && (!zipCodeAsString.match(/^\d{4}$/) || zipCodeAsString === '0000')) {
    validations.push({
      message: { key: 'address_component.validation_error_zipcode' },
      severity: 'error',
      bindingKey: 'zipCode',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Component,
    });
  }

  const houseNumberAsString =
    typeof houseNumber === 'string' || typeof houseNumber === 'number' ? String(houseNumber) : undefined;

  if (houseNumberAsString && !houseNumberAsString.match(/^[a-z,A-Z]\d{4}$/)) {
    validations.push({
      message: { key: 'address_component.validation_error_house_number' },
      severity: 'error',
      bindingKey: 'houseNumber',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Component,
    });
  }

  return validations;
}
