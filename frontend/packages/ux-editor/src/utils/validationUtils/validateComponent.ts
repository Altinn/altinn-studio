import { areItemsUnique } from 'app-shared/utils/arrayUtils';
import { FormItemType } from 'app-shared/types/FormItemType';
import { FormCheckboxesComponent, FormComponent, FormRadioButtonsComponent } from '../../types/FormComponent';

export enum ErrorCode {
  NoOptions = 'NoOptions',
  DuplicateValues = 'DuplicateValues',
}

export type ComponentValidationResult = {
  isValid: boolean;
  error?: ErrorCode;
}

const validateCheckboxGroup = (component: FormCheckboxesComponent): ComponentValidationResult => {
  if (!component.options || component.options.length === 0) {
    return {
      isValid: false,
      error: ErrorCode.NoOptions,
    };
  } else if (!areItemsUnique(component.options.map((option) => option.value))) {
    return {
      isValid: false,
      error: ErrorCode.DuplicateValues,
    };
  } else {
    return { isValid: true };
  }
};

const validateRadioGroup = (component: FormRadioButtonsComponent): ComponentValidationResult => {
  if (!component.options || component.options.length === 0) {
    return {
      isValid: false,
      error: ErrorCode.NoOptions,
    };
  } else if (!areItemsUnique(component.options.map((option) => option.value))) {
    return {
      isValid: false,
      error: ErrorCode.DuplicateValues,
    };
  } else {
    return { isValid: true };
  }
}

export const validateComponent = (component: FormComponent): ComponentValidationResult => {
  switch (component.type) {
    case FormItemType.Checkboxes:
      return validateCheckboxGroup(component);
    case FormItemType.RadioButtons:
      return validateRadioGroup(component);
    default:
      return { isValid: true };
  }
}
