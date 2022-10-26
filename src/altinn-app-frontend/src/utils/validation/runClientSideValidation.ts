import { getLayoutOrderFromTracks } from 'src/selectors/getLayoutOrder';
import { getCurrentDataTypeId } from 'src/utils/appMetadata';
import { convertDataBindingToModel } from 'src/utils/databindings';
import { resolvedLayoutsFromState } from 'src/utils/layout/hierarchy';
import {
  getValidator,
  validateEmptyFields,
  validateFormComponents,
  validateFormData,
} from 'src/utils/validation/validation';
import type { IRuntimeState } from 'src/types';

/**
 * Runs client side validations on state.
 * @param state
 */
export function runClientSideValidation(state: IRuntimeState) {
  const currentDataTaskDataTypeId = getCurrentDataTypeId(
    state.applicationMetadata.applicationMetadata,
    state.instanceData.instance,
    state.formLayout.layoutsets,
  );
  const model = convertDataBindingToModel(state.formData.formData);
  const validator = getValidator(
    currentDataTaskDataTypeId,
    state.formDataModel.schemas,
  );

  const hiddenFields = new Set(state.formLayout.uiConfig.hiddenFields);
  const layoutOrder = getLayoutOrderFromTracks(
    state.formLayout.uiConfig.tracks,
  );

  const layouts = resolvedLayoutsFromState(state);
  const validationResult = validateFormData(
    model,
    layouts,
    layoutOrder,
    validator,
    state.language.language,
    state.textResources.resources,
  );
  const componentSpecificValidations = validateFormComponents(
    state.attachments.attachments,
    layouts,
    layoutOrder,
    state.formData.formData,
    state.language.language,
    hiddenFields,
  );
  const emptyFieldsValidations = validateEmptyFields(
    state.formData.formData,
    layouts,
    layoutOrder,
    state.language.language,
    hiddenFields,
    state.textResources.resources,
  );
  return {
    model,
    validationResult,
    componentSpecificValidations,
    emptyFieldsValidations,
  };
}
