import { IRuntimeState } from 'src/types';
import { createSelector } from 'reselect';

/**
 * Selector for determining if we have an error in one of our api calls.
 * Returns true any errors is set in relevant states, false otherwise
 * @param state the redux state
 */
const getHasErrorsSelector = (state: IRuntimeState) => {
  const error = (
    state.party.error ||
    state.process.error ||
    state.profile.error ||
    state.language.error ||
    state.formLayout.error ||
    state.instanceData.error ||
    state.applicationMetadata.error ||
    state.formDataModel.error ||
    state.optionState.error);

  if (error !== null) {
    // we have an error on something we consider critical, return true
    return true;
  }

  // we have a few special cases where we allow 404 status codes but not other errors
  const applicationSettingsError = state.applicationSettings.error;
  if (applicationSettingsError && !applicationSettingsError.message?.includes('404')) {
      return true;
    }

  const textResourceError = state.textResources.error;
  if (textResourceError && !textResourceError.message?.includes('404')) {
      return true;
  }

  const formDynamicsError = state.formDynamics.error;
  if (formDynamicsError && !formDynamicsError.message?.includes('404')) {
      return true;
  }

  const formRulesError = state.formRules.error;
  if (formRulesError && !formRulesError.message?.includes('404')) {
      return true;
  }

  // 403 in formData handles with MissingRolesError, see Entrypoint.tsx
  const formDataError = state.formData.error;
  if (formDataError && !formDataError.message?.includes('403')) {
      return true;
  }

  return false;
};

const getHasErrors = () => {
  return createSelector(
    [getHasErrorsSelector],
    (hasErrors: boolean) => hasErrors,
  );
};

export const makeGetHasErrorsSelector = getHasErrors;
