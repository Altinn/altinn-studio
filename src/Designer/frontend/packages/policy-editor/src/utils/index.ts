import { ObjectUtils } from '@studio/pure-functions';
import type {
  PolicyAction,
  PolicyEditorUsage,
  PolicyRule,
  PolicyRuleCard,
  PolicyRuleResource,
  PolicySubject,
} from '../types';
import { INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE } from '../constants';

/**
 * Empty rule when new card added
 */
export const emptyPolicyRule: PolicyRuleCard = {
  ruleId: '0',
  resources: [],
  actions: [],
  subject: [],
  accessPackages: [],
  description: '',
};

export const policySubjectOrg: PolicySubject = {
  id: '[org]',
  name: 'Tjenesteeier',
  description: '[org]',
  legacyRoleCode: '[org]',
  urn: 'urn:altinn:org:[org]',
  legacyUrn: 'urn:altinn:org:[org]',
  provider: {
    code: INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE,
    id: '',
    name: 'Intern',
  },
};

export const organizationSubject: PolicySubject = {
  id: 'organization',
  legacyUrn: 'urn:altinn:partytype:organization',
  urn: 'urn:altinn:partytype:organization',
  name: 'Organisasjon',
  description: '',
  legacyRoleCode: 'organization',
  provider: {
    code: 'sys-special-organization',
    id: '',
    name: 'Intern',
  },
};

/**
 * Maps the resource string from backend to a resource object with type and id.
 *
 * @param resource the resoruce string to map
 *
 * @returns a mapped resource object
 */
export const mapResourceFromBackendToResource = (resource: string): PolicyRuleResource => {
  const resourceArr = resource.split(':');
  const id: string = resourceArr.pop();
  const type: string = resourceArr.join(':');

  return {
    type: type,
    id: id,
  };
};

export const mapPolicyRulesBackendObjectToPolicyRuleCard = (
  rules: PolicyRule[],
): PolicyRuleCard[] => {
  const newRules = rules.map((r) => {
    const idArr = r.ruleId.split(':');
    const id = idArr[idArr.length - 1];

    const mappedResources = r.resources.map((resource) =>
      resource.map((resource) => mapResourceFromBackendToResource(resource)),
    );

    return {
      ruleId: id,
      actions: r.actions,
      description: r.description,
      subject: r.subject,
      accessPackages: r.accessPackages || [],
      resources: mappedResources,
    };
  });
  return newRules;
};

/**
 * Maps a policy rule object used on the policy cards to a policy rule object
 * to be sent to backend where all fields are strings.
 *
 * @param policyRule the policy rule to map
 * @param ruleId the id of the rule
 *
 * @returns a mapped object ready to be sent to backend
 */
export const mapPolicyRuleToPolicyRuleBackendObject = (
  policyRule: PolicyRuleCard,
  ruleId: string,
): PolicyRule => {
  const resources: string[][] = policyRule.resources.map((resource) =>
    resource
      .filter((r) => r.id !== '' && r.type !== '')
      .map((r) => (r.type.startsWith('urn:') ? `${r.type}:${r.id}` : `urn:${r.type}:${r.id}`)),
  );

  return {
    ruleId,
    description: policyRule.description,
    subject: policyRule.subject,
    actions: policyRule.actions,
    accessPackages: policyRule.accessPackages,
    resources: resources,
  };
};

/**
 * Creates a new policy resource list with the initial object based on the
 * usage type.
 *
 * @param usageType the application using the policy editor
 * @param resourceType the value for the first input field (type)
 * @param resourceId the value for the second input field (id)
 *
 * @returns a list containing the new initial policy sub-resource objects
 */
export const createNewPolicyResource = (
  usageType: PolicyEditorUsage,
  resourceType: string,
  resourceId: string,
): PolicyRuleResource[] => {
  if (usageType === 'app') {
    return [
      { type: `${resourceType}:org`, id: '[ORG]' },
      { type: `${resourceType}:app`, id: '[APP]' },
    ];
  }
  if (usageType === 'resource') {
    return [{ type: resourceType, id: resourceId }];
  }
  return [];
};

/**
 * Merges actions from policy rules with existing action options.
 *
 * @param {PolicyRule[]} rules - The policy rules containing actions to be merged.
 * @param {PolicyAction[]} actions - The existing policy actions to merge with.
 *
 * @returns {PolicyAction[]} - The merged policy actions.
 */
export const mergeActionsFromPolicyWithActionOptions = (
  rules: PolicyRule[],
  actions: PolicyAction[],
): PolicyAction[] => {
  const existingActionIds = actions.map((action) => action.actionId);
  const copiedActions = ObjectUtils.deepCopy(actions);

  rules.forEach((rule) => {
    rule.actions.forEach((actionString) => {
      if (!existingActionIds.includes(actionString)) {
        const newAction: PolicyAction = {
          actionId: actionString,
          actionTitle: actionString,
          actionDescription: null,
        };
        copiedActions.push(newAction);
        existingActionIds.push(actionString);
      }
    });
  });

  return copiedActions;
};

/**
 * Merges subjects from policy rules with existing subject options.
 *
 * @param {PolicyRule[]} rules - The policy rules containing subjects to be merged.
 * @param {PolicySubject[]} subjects - The existing policy subjects to merge with.
 *
 * @returns {PolicySubject[]} - The merged policy subjects.
 */
export const mergeSubjectsFromPolicyWithSubjectOptions = (
  rules: PolicyRule[],
  subjects: PolicySubject[],
): PolicySubject[] => {
  const allRuleSubjectUrns = rules
    .flatMap((rule) => rule.subject)
    .map((subjectUrn) => subjectUrn.toLowerCase());
  const allSubjectUrns = subjects
    .reduce((acc, subject) => [...acc, subject.urn, subject.legacyUrn], [])
    .filter(Boolean)
    .map((subjectUrn) => subjectUrn.toLowerCase());

  const diff = [...new Set(allRuleSubjectUrns)].filter((urn) => !allSubjectUrns.includes(urn));
  const unknownSubjectsFromRules = [...diff].map((subjectUrn) =>
    createNewSubjectFromSubjectString(subjectUrn),
  );
  const merged = [...subjects, ...unknownSubjectsFromRules];
  return merged;
};

export const convertSubjectStringToSubjectId = (subjectString: string): string => {
  const lastColonIndex = subjectString.lastIndexOf(':');
  // The final element is the id
  return subjectString.slice(lastColonIndex + 1);
};

export const createNewSubjectFromSubjectString = (subjectString: string): PolicySubject => {
  const subjectId: string = convertSubjectStringToSubjectId(subjectString);
  return {
    legacyRoleCode: subjectId.toLowerCase(),
    name: subjectId,
    legacyUrn: subjectString,
    urn: subjectString,
    description: '',
    id: subjectString,
    provider: {
      code: INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE,
      id: '',
      name: '',
    },
  };
};

const findLargestNumberedRuleId = (rules: PolicyRuleCard[]): number | undefined => {
  const numberedIds = rules.map((rule) => Number(rule.ruleId)).filter((ruleId) => !isNaN(ruleId));

  if (numberedIds.length === 0) {
    return undefined;
  }
  return Math.max(...numberedIds);
};

export const getNewRuleId = (rules: PolicyRuleCard[]): string => {
  const largestNumberedRuleId = findLargestNumberedRuleId(rules);
  if (largestNumberedRuleId === undefined) {
    return '1';
  }
  return String(largestNumberedRuleId + 1);
};

/**
 * Check if subject list contains subject - case insensitive
 *
 * @param subjectList list of selected subjects
 * @param subjectUrn subject urn to search for
 *
 * @returns the id
 */
export const hasSubject = (
  subjectList: string[],
  subjectUrn: string,
  subjectLegacyUrn?: string,
): boolean => {
  return subjectList.some(
    (s) =>
      s.toLowerCase() === subjectUrn.toLowerCase() ||
      s.toLowerCase() === subjectLegacyUrn?.toLowerCase(),
  );
};

/**
 * Find subject in subject list
 *
 * @param subjectList list of all subjects
 * @param subjectUrn subject urn to search for
 *
 * @returns the subject, or undefined if not found
 */
export const findSubject = (
  subjectList: PolicySubject[],
  subjectUrn: string,
): PolicySubject | undefined => {
  return subjectList.find(
    (s) =>
      s.urn.toLowerCase() === subjectUrn.toLowerCase() ||
      s.legacyUrn?.toLowerCase() === subjectUrn.toLowerCase(),
  );
};
