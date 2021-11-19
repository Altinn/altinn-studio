import { IRuntimeState } from 'src/types';
import { createSelector } from 'reselect';

/**
 * Selector for determinig if we have an error in one of our api calls.
 * Returns true any errors is set in relevant states, false otherwise
 * @param state the redux state
 */
const getHasErrorsSelector = (state: IRuntimeState) => {
  let hasError = false;
  const error = (
    state.formData.error ||
    state.party.error ||
    state.process.error ||
    state.profile.error ||
    state.language.error ||
    state.formLayout.error ||
    state.formDynamics.error ||
    state.instanceData.error ||
    state.applicationMetadata.error ||
    state.formDataModel.error ||
    state.optionState.error ||
    state.applicationSettings.error);

  if (error !== null) {
    // we have an error on something we consider critical, return true
    return true;
  }

  // we have a few special cases where we allow 404 status codes but not other errors
  const applicationSettingsError = state.applicationSettings.error;
  if (applicationSettingsError !== null) {
    if (applicationSettingsError.message.indexOf('404') === -1) {
      hasError = true;
    }
  }
  
  const textResourceError = state.textResources.error;
  if (textResourceError !== null) {
    if (textResourceError.message.indexOf('404') === -1) {
      hasError = true;
    }
  }

  const formDynamicsError = state.formDynamics.error;
  if (formDynamicsError !== null) {
    if (formDynamicsError.message.indexOf('404') === -1) {
      hasError = true;
    }
  }

  const formRulesError = state.formRules.error;
  if (formRulesError !== null) {
    if (formRulesError.message.indexOf('404') === -1) {
      hasError = true;
    }
  }

  return hasError;
};

const getHasErrors = () => {
  return createSelector(
    [getHasErrorsSelector],
    (hasErrors: boolean) => hasErrors,
  );
};

export const makeGetHasErrorsSelector = getHasErrors;
