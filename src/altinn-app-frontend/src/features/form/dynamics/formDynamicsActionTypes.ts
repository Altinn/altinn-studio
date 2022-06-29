const moduleName = 'FORM_DYNAMIC';

// Action for running conditional rendering rules
export const CHECK_IF_CONDITIONAL_RULE_SHOULD_RUN = `${moduleName}.CHECK_IF_CONDITIONAL_RULE_SHOULD_RUN`;

// Check if API actions should be run
export const CHECK_IF_API_ACTIONS_SHOULD_RUN = `${moduleName}.CHECK_IF_API_ACTIONS_SHOULD_RUN`;

// Fetch Service configuration (contains apis and conditional rendering rules)
export const FETCH_SERVICE_CONFIG = `${moduleName}.FETCH_SERVICE_CONFIG`;
export const FETCH_SERVICE_CONFIG_FULFILLED = `${moduleName}.FETCH_SERVICE_CONFIG_FULFILLED`;
export const FETCH_SERVICE_CONFIG_REJECTED = `${moduleName}.FETCH_SERVICE_CONFIG_REJECTED`;
