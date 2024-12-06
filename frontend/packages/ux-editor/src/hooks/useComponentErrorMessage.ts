import type { FormComponent } from '../types/FormComponent';
import { useTranslation } from 'react-i18next';
import { useValidateComponent } from './useValidateComponent';
import { ComponentType } from 'app-shared/types/ComponentType';

/**
 * Returns an error message for the given component, or null if the component is valid.
 * @param component The component to validate.
 * @returns Null if the component is valid, otherwise an error message.
 */
export const useComponentErrorMessage = (component: FormComponent): string | null => {
  const { t } = useTranslation();
  const { isValid, error } = useValidateComponent(component);
  if (isValid) return null;
  switch (component.type) {
    case ComponentType.Checkboxes:
      return t(`ux_editor.checkboxes_error_${error}`);
    case ComponentType.RadioButtons:
      return t(`ux_editor.radios_error_${error}`);
    default:
      return null;
  }
};
