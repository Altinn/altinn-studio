import { getDataTaskDataTypeId } from 'src/utils/appMetadata';
import { convertDataBindingToModel } from 'src/utils/databindings';
import {
  getValidator,
  validateEmptyFields,
  validateFormComponents,
  validateFormData,
} from 'src/utils/validation/validation';
import type { IRuntimeState } from 'src/types';

/** Runs client side validations on state.
 * @param state
 */
export function runClientSideValidation(state: IRuntimeState) {
  const currentDataTaskDataTypeId = getDataTaskDataTypeId(
    state.instanceData.instance.process.currentTask.elementId,
    state.applicationMetadata.applicationMetadata.dataTypes,
  );
  const model = convertDataBindingToModel(state.formData.formData);
  const layoutOrder: string[] = state.formLayout.uiConfig.layoutOrder;
  const validator = getValidator(
    currentDataTaskDataTypeId,
    state.formDataModel.schemas,
  );
  const validationResult = validateFormData(
    model,
    state.formLayout.layouts,
    layoutOrder,
    validator,
    state.language.language,
    state.textResources.resources,
  );
  const componentSpecificValidations = validateFormComponents(
    state.attachments.attachments,
    state.formLayout.layouts,
    layoutOrder,
    state.formData.formData,
    state.language.language,
    state.formLayout.uiConfig.hiddenFields,
    state.formLayout.uiConfig.repeatingGroups,
  );
  const emptyFieldsValidations = validateEmptyFields(
    state.formData.formData,
    state.formLayout.layouts,
    layoutOrder,
    state.language.language,
    state.formLayout.uiConfig.hiddenFields,
    state.formLayout.uiConfig.repeatingGroups,
    state.textResources.resources,
  );
  return {
    model,
    validationResult,
    componentSpecificValidations,
    emptyFieldsValidations,
  };
}
