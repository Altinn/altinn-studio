export type Action =
  | 'read'
  | 'write'
  | 'delete'
  | 'confirm'
  | 'sign'
  | 'instantiate'
  | 'reject'
  | 'pay'
  | 'complete';

export type PolicyRule = {
  ruleId: string;
  description: string;
  subject: Array<string>;
  actions: Action[];
  resources: Array<string[]>;
};

export type RequiredAuthLevel = '0' | '3' | '4';

export type Policy = {
  rules: PolicyRule[];
  requiredAuthenticationLevelEndUser: RequiredAuthLevel;
  requiredAuthenticationLevelOrg: string;
};
