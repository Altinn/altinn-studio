export type { PolicyAction } from 'app-shared/types/PolicyAction';
export type { PolicySubject } from 'app-shared/types/PolicySubject';
export type { Policy, PolicyRule, RequiredAuthLevel } from 'app-shared/types/Policy';

export type AppPolicyActionMap = {
  [key: string]: string;
};

export type AppSubResourceDefaultLimitationType = 'urn:altinn:org' | 'urn:altinn:app';

export interface PolicyRuleCard {
  ruleId: string;
  description: string;
  subject: string[];
  accessPackages?: string[];
  actions: string[];
  resources: PolicyRuleResource[][];
}

export interface PolicyRuleResource {
  type: string;
  id: string;
}

export type PolicyEditorUsage = 'app' | 'resource';

export type PolicyError = {
  resourceError: boolean;
  actionsError: boolean;
  subjectsError: boolean;
};
