import { getLayoutOrderFromTracks } from 'src/selectors/getLayoutOrder';
import { getCurrentDataTypeForApplication } from 'src/utils/appMetadata';
import { convertDataBindingToModel } from 'src/utils/databindings';
import { resolvedLayoutsFromState } from 'src/utils/layout/hierarchy';
import {
  getValidator,
  validateEmptyFields,
  validateFormComponents,
  validateFormData,
} from 'src/utils/validation/validation';
import type { IRuntimeState, IValidationResult, IValidations } from 'src/types';

interface ValidationResult {
  model: any;
  validationResult: IValidationResult;
  componentSpecificValidations: IValidations;
  emptyFieldsValidations: IValidations;
}

/**
 * Runs client side validations on state.
 * @param state
 */
export function runClientSideValidation(state: IRuntimeState): ValidationResult {
  const out: ValidationResult = {
    model: {},
    validationResult: {
      validations: {},
      invalidDataTypes: false,
    },
    componentSpecificValidations: {},
    emptyFieldsValidations: {},
  };

  if (!state.applicationMetadata.applicationMetadata) {
    return out;
  }

  const currentDataTaskDataTypeId = getCurrentDataTypeForApplication({
    application: state.applicationMetadata.applicationMetadata,
    instance: state.instanceData.instance,
    layoutSets: state.formLayout.layoutsets,
  });
  out.model = convertDataBindingToModel(state.formData.formData);
  const validator = getValidator(currentDataTaskDataTypeId, state.formDataModel.schemas);

  const hiddenFields = new Set(state.formLayout.uiConfig.hiddenFields);
  const layoutOrder = getLayoutOrderFromTracks(state.formLayout.uiConfig.tracks);

  if (!layoutOrder || !state.language.language) {
    return out;
  }

  const layouts = resolvedLayoutsFromState(state);
  out.validationResult = validateFormData(
    out.model,
    layouts,
    layoutOrder,
    validator,
    state.language.language,
    state.textResources.resources,
  );
  out.componentSpecificValidations = validateFormComponents(
    state.attachments.attachments,
    layouts,
    layoutOrder,
    state.formData.formData,
    state.language.language,
    hiddenFields,
  );
  out.emptyFieldsValidations = validateEmptyFields(
    state.formData.formData,
    layouts,
    layoutOrder,
    state.language.language,
    hiddenFields,
    state.textResources.resources,
  );

  return out;
}
