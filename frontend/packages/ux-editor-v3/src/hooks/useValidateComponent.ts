import { areItemsUnique } from 'app-shared/utils/arrayUtils';
import { ComponentType } from 'app-shared/types/ComponentType';
import type {
  FormCheckboxesComponent,
  FormComponent,
  FormRadioButtonsComponent,
} from '../types/FormComponent';
import { useOptionListIdsQuery } from './queries/useOptionListIdsQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

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
  optionListIds: string[],
): ComponentValidationResult => {
  if (component.optionsId) {
    const isExistingOptionId = optionListIds?.includes(component.optionsId);
    if (!isExistingOptionId) {
      return {
        isValid: false,
        error: ErrorCode.NoOptions,
      };
    }
  } else {
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
    }
  }

  return { isValid: true };
};

export const useValidateComponent = (component: FormComponent): ComponentValidationResult => {
  const { org, app } = useStudioUrlParams();
  const { data: optionListIds } = useOptionListIdsQuery(org, app);

  switch (component.type) {
    case ComponentType.Checkboxes:
    case ComponentType.RadioButtons:
      return validateOptionGroup(component, optionListIds);
    default:
      return { isValid: true };
  }
};
