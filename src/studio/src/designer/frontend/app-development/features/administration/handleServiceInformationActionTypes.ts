const moduleName: string = 'HANDLE_SERVICE_INFORMATION';

/**
 * This file defines all action that will be triggered and listened on by SAGAS and REDUCERS used to fetch service
 */

// All fetch service actions
export const FETCH_SERVICE: string = `${moduleName}.FETCH_SERVICE`;
export const FETCH_SERVICE_FULFILLED: string = `${moduleName}.FETCH_SERVICE_FULFILLED`;
export const FETCH_SERVICE_REJECTED: string = `${moduleName}.FETCH_SERVICE_REJECTED`;

// All fetch service name actions
export const FETCH_SERVICE_NAME: string = `${moduleName}.FETCH_SERVICE_NAME`;
export const FETCH_SERVICE_NAME_FULFILLED: string = `${moduleName}.FETCH_SERVICE_NAME_FULFILLED`;
export const FETCH_SERVICE_NAME_REJECTED: string = `${moduleName}.FETCH_SERVICE_NAME_REJECTED`;

// All save service name actions
export const SAVE_SERVICE_NAME: string = `${moduleName}.SAVE_SERVICE_NAME`;
export const SAVE_SERVICE_NAME_FULFILLED: string = `${moduleName}.SAVE_SERVICE_NAME_FULFILLED`;
export const SAVE_SERVICE_NAME_REJECTED: string = `${moduleName}.SAVE_SERVICE_NAME_REJECTED`;

// All fetch repository initial commit actions
export const FETCH_INITIAL_COMMIT: string = `${moduleName}.FETCH_INITIAL_COMMIT`;
export const FETCH_INITIAL_COMMIT_FULFILLED: string = `${moduleName}.FETCH_INITIAL_COMMIT_FULFILLED`;
export const FETCH_INITIAL_COMMIT_REJECTED: string = `${moduleName}.FETCH_INITIAL_COMMIT_REJECTED`;

// All fetch service config actions
export const FETCH_SERVICE_CONFIG: string = `${moduleName}.FETCH_SERVICE_CONFIG`;
export const FETCH_SERVICE_CONFIG_FULFILLED: string = `${moduleName}.FETCH_SERVICE_CONFIG_FULFILLED`;
export const FETCH_SERVICE_CONFIG_REJECTED: string = `${moduleName}.FETCH_SERVICE_CONFIG_REJECTED`;

// All save service config actions
export const SAVE_SERVICE_CONFIG: string = `${moduleName}.SAVE_SERVICE_CONFIG`;
export const SAVE_SERVICE_CONFIG_FULFILLED: string = `${moduleName}.SAVE_SERVICE_CONFIG_FULFILLED`;
export const SAVE_SERVICE_CONFIG_REJECTED: string = `${moduleName}.SAVE_SERVICE_CONFIG_REJECTED`;
