const moduleName: string = 'APP_CONFIG';

/**
 * This file defines all action that will be triggered and listened on by SAGAS and REDUCERS used to fetch language
 */
// All fetch language actions
export const FETCH_LANGUAGE: string = `${moduleName}.FETCH_LANGUAGE`;
export const FETCH_LANGUAGE_FULFILLED: string = `${moduleName}.FETCH_LANGUAGE_FULFILLED`;
export const FETCH_LANGUAGE_REJECTED: string = `${moduleName}.FETCH_LANGUAGE_REJECTED`;
