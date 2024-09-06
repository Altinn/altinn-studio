import type { JsonPatch } from 'src/features/formData/jsonPatch/types';
import type { BackendValidationIssueGroups, BuiltInValidationIssueSources } from 'src/features/validation';

/**
 * This is the default time (in milliseconds) to wait before debouncing the form data. That means, we'll wait this
 * long before we move the data the user is currently typing into the debouncedCurrentData object. The debounced
 * data is less fresh than currentData, but it's the data we'll use to evaluate expressions, output in text resources,
 * etc. Over time we might migrate to fresher data for these use-cases as well.
 *
 * The amount of time we'll wait before saving the data to the server usually also this value, but it can be
 * configured separately by for example saving the data on page navigation only.
 */
export const DEFAULT_DEBOUNCE_TIMEOUT = 400;

/**
 * This field always exists in the data model for objects inside arrays (i.e. repeating groups). It's used to
 * identify the object in the array in a way that's more stable than the index. This is important because the
 * index can change when the array is sorted, and we want to be able to sort the array without losing track of
 * which objects are which within it.
 */
export const ALTINN_ROW_ID = 'altinnRowId';

export interface IDataModelPatchRequest {
  patch: JsonPatch;
  ignoredValidators: BuiltInValidationIssueSources[];
}

export interface IDataModelPatchResponse {
  validationIssues: BackendValidationIssueGroups;
  newDataModel: object;
}

export interface IDataModelMultiPatchRequest {
  patches: { [dataElementId: string]: JsonPatch };
  ignoredValidators: BuiltInValidationIssueSources[];
}

export interface IDataModelMultiPatchResponse {
  validationIssues: BackendValidationIssueGroups;
  newDataModels: { [dataElementId: string]: object };
}
