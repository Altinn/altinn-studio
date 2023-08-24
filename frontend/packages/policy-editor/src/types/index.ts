export interface PolicyRuleCard {
  ruleId: string;
  description: string;
  subject: string[];
  actions: string[];
  resources: PolicyRuleResource[][];
}

export interface PolicyRuleResource {
  type: string;
  id: string;
}

export interface PolicySubject {
  subjectId: string;
  subjectSource: string;
  subjectTitle: string;
  subjectDescription: string;
}

export interface PolicyAction {
  actionId: string;
  actionTitle: string;
  actionDescription: string | null;
}

export interface PolicyRule {
  ruleId: string;
  description: string;
  subject: string[];
  actions: string[];
  resources: string[][];
}

export type RequiredAuthLevel = "0" | "3" | "4";

export interface Policy {
  rules: PolicyRule[] | null;
  requiredAuthenticationLevelEndUser: RequiredAuthLevel;
  requiredAuthenticationLevelOrg: string;
}

export type PolicyEditorUsage = "app" | "resource";
