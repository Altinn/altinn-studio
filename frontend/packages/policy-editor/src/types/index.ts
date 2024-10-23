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
  urn: string;
  name: {
    nb: string;
    nn: string;
    en: string;
  };
  description: {
    nb: string;
    nn: string;
    en: string;
  };
  services: AccessPackageResource[];
  tags: string[];
}

export interface PolicyAccessPackageTag {
  id: string;
  name: {
    nb: string;
    nn: string;
    en: string;
  };
  description: {
    nb: string;
    nn: string;
    en: string;
  };
  icon: string;
  shortDescription: {
    nb: string;
    nn: string;
    en: string;
  };
  tagGroups: string[];
}

export interface PolicyAccessPackageTagGroup {
  id: string;
  name: {
    nb: string;
    nn: string;
    en: string;
  };
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

export interface AccessPackagesDto {
  tagsGroups: PolicyAccessPackageTagGroup[];
  tags: PolicyAccessPackageTag[];
  accessPackages: PolicyAccessPackage[];
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
