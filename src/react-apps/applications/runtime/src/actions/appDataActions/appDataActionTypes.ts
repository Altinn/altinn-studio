const moduleName: string = 'APP_CONFIG';

/**
 * This file defines all action that will be triggered and listened on by SAGAS and REDUCERS
 */
// All design mode actions
export const SET_DESIGN_MODE: string = `${moduleName}.SET_DESIGNER_MODE`;
export const SET_DESIGN_MODE_FULFILLED: string = `${moduleName}.SET_DESIGNER_MODE_FULFILLED`;
export const SET_DESIGN_MODE_REJECTED: string = `${moduleName}.SET_DESIGNER_MODE_REJECTED`;

// All fetch form datamodel actions
export const FETCH_DATA_MODEL: string = `${moduleName}.FETCH_DATA_MODEL`;
export const FETCH_DATA_MODEL_FULFILLED: string = `${moduleName}.FETCH_DATA_MODEL_FULFILLED`;
export const FETCH_DATA_MODEL_REJECTED: string = `${moduleName}.FETCH_DATA_MODEL_REJECTED`;

// Fetch rule handler actions
export const FETCH_RULE_MODEL: string = `${moduleName}.FETCH_RULE_MODEL`;
export const FETCH_RULE_MODEL_FULFILLED: string = `${moduleName}.FETCH_RULE_MODEL_FULFILLED`;
export const FETCH_RULE_MODEL_REJECTED: string = `${moduleName}.FETCH_RULE_MODEL_REJECTED`;

// All load text resource actions
export const LOAD_TEXT_RESOURCES: string = `${moduleName}.LOAD_TEXT_RESOURCES`;
export const LOAD_TEXT_RESOURCES_FULFILLED: string = `${moduleName}.LOAD_TEXT_RESOURCES_FULFILLED`;
export const LOAD_TEXT_RESOURCES_REJECTED: string = `${moduleName}.LOAD_TEXT_RESOURCES_REJECTED`;

// All fetch codeLists actions
export const FETCH_CODE_LISTS: string = `${moduleName}.FETCH_CODE_LISTS`;
export const FETCH_CODE_LISTS_FULFILLED: string = `${moduleName}.FETCH_CODE_LISTS_FULFILLED`;
export const FETCH_CODE_LISTS_REJECTED: string = `${moduleName}.FETCH_CODE_LISTS_REJECTED`;

// All fetch language actions
export const FETCH_LANGUAGE: string = `${moduleName}.FETCH_LANGUAGE`;
export const FETCH_LANGUAGE_FULFILLED: string = `${moduleName}.FETCH_LANGUAGE_FULFILLED`;
export const FETCH_LANGUAGE_REJECTED: string = `${moduleName}.FETCH_LANGUAGE_REJECTED`;

// All fetch third party components actions
export const FETCH_THIRD_PARTY_COMPONENTS: string = `${moduleName}.FETCH_THIRD_PARTY_COMPONENTS`;
export const FETCH_THIRD_PARTY_COMPONENTS_FULFILLED: string = `${moduleName}.FETCH_THIRD_PARTY_COMPONENTS_FULFILLED`;
export const FETCH_THIRD_PARTY_COMPONENTS_REJECTED: string = `${moduleName}.FETCH_THIRD_PARTY_COMPONENTS_REJECTED`;
