export type PolicyRule = {
  ruleId: string;
  description: string;
  subject: Array<string>;
  actions: string[];
  accessPackages?: string[];
  resources: Array<string[]>;
};

export type RequiredAuthLevel = '0' | '3' | '4';

/**
 * Levels that can no longer be selected, but that older policies may still require.
 */
export type RemovedAuthLevel = '1' | '2';

export type Policy = {
  rules: PolicyRule[];
  requiredAuthenticationLevelEndUser: RequiredAuthLevel | RemovedAuthLevel;
  requiredAuthenticationLevelOrg: string;
};
