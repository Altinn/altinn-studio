export interface PolicyType {
  rules: PolicyRuleCardType[]
}

export interface PolicyRuleCardType {
  ruleId: string;
  description: string;
  subject: string[];
  actions: string[];
  resources: PolicyRuleResourceType[][];
}

export interface PolicyRuleResourceType {
  type: string;
  id: string;
}

export interface PolicySubjectType {
  subjectId: string;
  subjectSource: string;
  subjectTitle: string;
  subjectDescription: string;
}

export interface PolicyRuleBackendType {
  ruleId: string,
  description: string,
  subject: string[],
  actions: string[],
  resources: string[][]
}

export type RequiredAuthLevelType = '1' | '2' | '3' | '4';
export interface PolicyEditorSendType {
  rules: PolicyRuleBackendType[],
  requiredAuthenticationLevelEndUser: RequiredAuthLevelType,
  requiredAuthenticationLevelOrg: string
}

export type NavigationBarPageType = 'about' | 'security' | 'policy';
