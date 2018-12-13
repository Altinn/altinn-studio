const moduleName: string = 'APP_CONFIG';

/**
 * This file defines all action that will be triggered and listened on by SAGAS and REDUCERS
 * related to the dashboard, like fetching services and current user
 */
// All fetch services actions
export const FETCH_SERVICES: string = `${moduleName}.FETCH_SERVICES`;
export const FETCH_SERVICES_FULFILLED: string = `${moduleName}.FETCH_SERVICES_FULFILLED`;
export const FETCH_SERVICES_REJECTED: string = `${moduleName}.FETCH_SERVICES_REJECTED`;

// All fetch current user actions
export const FETCH_CURRENT_USER: string = `${moduleName}.FETCH_CURRENT_USER`;
export const FETCH_CURRENT_USER_FULFILLED: string = `${moduleName}.FETCH_CURRENT_USER_FULFILLED`;
export const FETCH_CURRENT_USER_REJECTED: string = `${moduleName}.FETCH_CURRENT_USER_REJECTED`;