import { FormComponent } from '../types/FormComponent';
import { useTranslation } from 'react-i18next';
import { validateComponent } from '../utils/validationUtils';
import { FormItemType } from 'app-shared/types/FormItemType';

/**
 * Returns an error message for the given component, or null if the component is valid.
 * @param component The component to validate.
 * @returns Null if the component is valid, otherwise an error message.
 */
export const useComponentErrorMessage = (component: FormComponent): string | null => {
  const { t } = useTranslation();
  const { isValid, error } = validateComponent(component);
  if (isValid) return null;
  switch(component.type) {
    case FormItemType.Checkboxes:
      return t(`ux_editor.checkboxes_error_${error}`);
    case FormItemType.RadioButtons:
      return t(`ux_editor.radios_error_${error}`);
    default:
      return null;
  }
}
