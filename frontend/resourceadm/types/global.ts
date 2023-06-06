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

export interface PolicyActionType {
  actionId: string,
  actionTitle: string,
  actionDescription: string | null
}

export interface PolicyRuleBackendType {
  ruleId: string,
  description: string,
  subject: string[],
  actions: string[],
  resources: string[][]
}

export type RequiredAuthLevelType = '1' | '2' | '3' | '4';
export interface PolicyBackendType {
  rules: PolicyRuleBackendType[],
  requiredAuthenticationLevelEndUser: RequiredAuthLevelType,
  requiredAuthenticationLevelOrg: string
}

export type NavigationBarPageType = 'about' | 'security' | 'policy';
