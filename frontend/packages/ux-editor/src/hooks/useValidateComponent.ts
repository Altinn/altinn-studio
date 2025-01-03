import { ArrayUtils } from '@studio/pure-functions';
import { ComponentType } from 'app-shared/types/ComponentType';
import type {
  FormCheckboxesComponent,
  FormComponent,
  FormRadioButtonsComponent,
} from '../types/FormComponent';

export enum ErrorCode {
  NoOptions = 'NoOptions',
  DuplicateValues = 'DuplicateValues',
}

export type ComponentValidationResult = {
  isValid: boolean;
  error?: ErrorCode;
};

const validateOptionGroup = (
  component: FormCheckboxesComponent | FormRadioButtonsComponent,
): ComponentValidationResult => {
  if (!component.optionsId) {
    if (!component.options || component.options.length === 0) {
      return {
        isValid: false,
        error: ErrorCode.NoOptions,
      };
    } else if (!ArrayUtils.areItemsUnique(component.options.map((option) => option.value))) {
      return {
        isValid: false,
        error: ErrorCode.DuplicateValues,
      };
    }
  }

  return { isValid: true };
};

export const useValidateComponent = (component: FormComponent): ComponentValidationResult => {
  switch (component.type) {
    case ComponentType.Checkboxes:
    case ComponentType.RadioButtons:
      return validateOptionGroup(component);
    default:
      return { isValid: true };
  }
};
