import { staticUseLanguageFromState } from 'src/hooks/useLanguage';
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
  const validator = getValidator(currentDataTaskDataTypeId, state.formDataModel.schemas);
  const layoutOrder = getLayoutOrderFromTracks(state.formLayout.uiConfig.tracks);
  const model = convertDataBindingToModel(state.formData.formData);
  const layouts = resolvedLayoutsFromState(state);
  const langTools = staticUseLanguageFromState(state);

  if (!layoutOrder || !layouts) {
    return out;
  }

  out.validationResult = validateFormData(model, layouts, layoutOrder, validator, langTools);
  out.componentSpecificValidations = validateFormComponents(
    state.attachments.attachments,
    layouts,
    layoutOrder,
    langTools,
  );
  out.emptyFieldsValidations = validateEmptyFields(state.formData.formData, layouts, layoutOrder, langTools);

  return out;
}
