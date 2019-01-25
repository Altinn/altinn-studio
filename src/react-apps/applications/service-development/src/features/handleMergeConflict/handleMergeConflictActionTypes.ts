const moduleName: string = 'HANDLE_MERGE_CONFLICT';

/**
 * This file defines all action that will be triggered and listened on by SAGAS and REDUCERS used to fetch REPO_STATUS
 */

// All fetch REPO_STATUS actions
export const FETCH_REPO_STATUS: string = `${moduleName}.FETCH_REPO_STATUS`;
export const FETCH_REPO_STATUS_FULFILLED: string = `${moduleName}.FETCH_REPO_STATUS_FULFILLED`;
export const FETCH_REPO_STATUS_REJECTED: string = `${moduleName}.FETCH_REPO_STATUS_REJECTED`;
