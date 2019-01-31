const moduleName: string = 'HANDLE_FETCH_SERVICE';

/**
 * This file defines all action that will be triggered and listened on by SAGAS and REDUCERS used to fetch service
 */

// All fetch service actions
export const FETCH_SERVICE: string = `${moduleName}.FETCH_SERVICE`;
export const FETCH_SERVICE_FULFILLED: string = `${moduleName}.FETCH_SERVICE_FULFILLED`;
export const FETCH_SERVICE_REJECTED: string = `${moduleName}.FETCH_SERVICE_REJECTED`;
