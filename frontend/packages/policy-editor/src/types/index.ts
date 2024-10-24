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

export interface PolicySubject {
  subjectId: string;
  subjectSource: string;
  subjectTitle: string;
  subjectDescription: string;
}

export interface PolicyAccessPackage {
  id: string;
  urn: string;
  name: string;
  description: string;
  services: AccessPackageResource[];
  area: PolicyAccessPackageArea;
}

export interface PolicyAccessPackageArea {
  id: string;
  name: string;
  description: string;
  iconName: string;
  shortDescription: string;
}

export interface AccessPackageResource {
  identifier: string;
  title: {
    nb: string;
    nn: string;
    en: string;
  };
  hasCompetentAuthority?: {
    name: {
      nb: string;
      nn: string;
      en: string;
    };
    organization: string;
    orgcode: string;
  };
  iconUrl: string;
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
  accessPackages?: string[];
  resources: string[][];
}

export type RequiredAuthLevel = '0' | '3' | '4';

export interface Policy {
  rules: PolicyRule[] | null;
  requiredAuthenticationLevelEndUser: RequiredAuthLevel;
  requiredAuthenticationLevelOrg: string;
}

export type PolicyEditorUsage = 'app' | 'resource';

export type PolicyError = {
  resourceError: boolean;
  actionsError: boolean;
  subjectsError: boolean;
};
