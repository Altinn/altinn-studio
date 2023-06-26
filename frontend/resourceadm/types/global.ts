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
  rules: PolicyRuleBackendType[] | null,
  requiredAuthenticationLevelEndUser: RequiredAuthLevelType,
  requiredAuthenticationLevelOrg: string
}

export type NavigationBarPageType = 'about' | 'policy' | 'deploy';

export interface ResourceType {
  title: string;
  createdBy: string;
  lastChanged: string;
  hasPolicy: boolean;
  identifier: string;
}

export type PolicyRuleErrorType = 'policyerror.missingsubject' | 'policyerror.missingaction' | 'policyerror.missingresource'

export interface PolicyErrorType {
  ruleNumber: number;
  errors: PolicyRuleErrorType[];
}
