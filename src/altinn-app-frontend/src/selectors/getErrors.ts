import { createSelector } from 'reselect';

import type { IRuntimeState } from 'src/types';

let lastLogged: Error | null = null;

/**
 * Selector for determining if we have an error in one of our api calls.
 * Returns true any errors is set in relevant states, false otherwise
 * @param state the redux state
 */
const getHasErrorsSelector = (state: IRuntimeState) => {
  const exceptIfIncludes = (maybeError: Error | null, lookFor: string): Error | null => {
    if (maybeError && maybeError.message?.includes(lookFor)) {
      return null;
    }

    return maybeError;
  };

  const error =
    state.party.error ||
    state.process.error ||
    state.profile.error ||
    state.language.error ||
    state.formLayout.error ||
    state.instanceData.error ||
    state.applicationMetadata.error ||
    state.formDataModel.error ||
    state.optionState.error ||
    state.attachments.error ||
    // we have a few special cases where we allow 404 status codes but not other errors
    exceptIfIncludes(state.applicationSettings.error, '404') ||
    exceptIfIncludes(state.textResources.error, '404') ||
    exceptIfIncludes(state.formDynamics.error, '404') ||
    exceptIfIncludes(state.formRules.error, '404') ||
    // 403 in formData handles with MissingRolesError, see Entrypoint.tsx
    exceptIfIncludes(state.formData.error, '403');

  if (error !== null) {
    // We have an error on something we consider critical
    if (lastLogged !== error) {
      typeof jest === 'undefined' && console.error(error);
      lastLogged = error;
    }

    return true;
  }

  return false;
};

const getHasErrors = () => {
  return createSelector([getHasErrorsSelector], (hasErrors: boolean) => hasErrors);
};

export const makeGetHasErrorsSelector = getHasErrors;
