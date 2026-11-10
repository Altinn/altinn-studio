import type { Policy } from '@altinn/policy-editor';
import { getDeprecatedAltinn2SubjectsFromRules } from 'app-shared/utils/altinn2RoleUtils';
import type { PolicyRule } from 'app-shared/types/Policy';
import { AllRoles } from './AllRoles';

export const ALTINN_APP = 'AltinnApp';
export const MIGRATED_APP = 'MigratedApp';

export enum EnvId {
  TT02 = 'tt02',
  PROD = 'prod',
}

export type ResourcePolicyData = {
  identifier: string;
  policy: Policy;
  resourceType: string;
  existsInGitea?: boolean;
};

export interface TableRowData extends ResourcePolicyData {
  a2Roles: string[];
  otherRoles: string[];
}

const ROLECODE_URN_PREFIX = 'urn:altinn:rolecode:';

const knownRoleUrns = new Set(
  AllRoles.flatMap((role) => [role.urn, role.legacyUrn])
    .filter(Boolean)
    .map((urn) => urn.toLowerCase()),
);

const getUnknownRoleCodeSubjects = (rules: PolicyRule[]): string[] => {
  return rules
    .flatMap((rule) => rule.subject)
    .map((subject) => subject.toLowerCase())
    .filter((subject) => subject.startsWith(ROLECODE_URN_PREFIX) && !knownRoleUrns.has(subject));
};

export const getDeprecatedAltinn2Subjects = (rules: PolicyRule[]) => {
  const deprecatedSubjects = getDeprecatedAltinn2SubjectsFromRules(rules).map((subject) =>
    subject.urn.toLowerCase(),
  );
  const unknownRoleCodeSubjects = getUnknownRoleCodeSubjects(rules).filter(
    (subject) => !deprecatedSubjects.includes(subject),
  );
  return [...deprecatedSubjects, ...unknownRoleCodeSubjects];
};
