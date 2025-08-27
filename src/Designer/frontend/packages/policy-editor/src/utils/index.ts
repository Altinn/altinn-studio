import { ObjectUtils } from 'libs/studio-pure-functions/src';
import type {
  PolicyAction,
  PolicyEditorUsage,
  PolicyRule,
  PolicyRuleCard,
  PolicyRuleResource,
  PolicySubject,
} from '../types';

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

export const organizationSubject: PolicySubject = {
  subjectId: 'organization',
  subjectSource: 'altinn:partytype',
  subjectTitle: '',
  subjectDescription: '',
};
export const accessListSubjectSource = 'altinn:accesslist';

export const extractPolicyIdsFromPolicySubjects = (policySubjects: string[]): string[] => {
  const extractPolicyIdFromPolicySubject = (policySubject: string): string => {
    const splitted = policySubject.split(':');
    return splitted[splitted.length - 1];
  };
  return policySubjects.map(extractPolicyIdFromPolicySubject);
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

    const subjectIds: string[] = extractPolicyIdsFromPolicySubjects(r.subject);

    return {
      ruleId: id,
      actions: r.actions,
      description: r.description,
      subject: subjectIds,
      accessPackages: r.accessPackages || [],
      resources: mappedResources,
    };
  });
  return newRules;
};

/**
 * Maps a Subject title to the string format to send to backend: "urn:subjectsource:subjectid"
 */
export const mapSubjectIdToSubjectString = (
  subjectOptions: PolicySubject[],
  subjectId: string,
): string => {
  const subject: PolicySubject = subjectOptions.find(
    (s) => s.subjectId.toLowerCase() === subjectId.toLowerCase(),
  );

  if (!subject) return;
  return `urn:${subject.subjectSource}:${subject.subjectId}`;
};

/**
 * Maps a policy rule object used on the policy cards to a policy rule object
 * to be sent to backend where all fields are strings.
 *
 * @param subjectOptions the possible subjects to select from
 * @param policyRule the policy rule to map
 * @param ruleId the id of the rule
 *
 * @returns a mapped object ready to be sent to backend
 */
export const mapPolicyRuleToPolicyRuleBackendObject = (
  subjectOptions: PolicySubject[],
  policyRule: PolicyRuleCard,
  ruleId: string,
): PolicyRule => {
  const resources: string[][] = policyRule.resources.map((resource) =>
    resource
      .filter((r) => r.id !== '' && r.type !== '')
      .map((r) => (r.type.startsWith('urn:') ? `${r.type}:${r.id}` : `urn:${r.type}:${r.id}`)),
  );

  const subject: string[] = policyRule.subject.map((s) =>
    mapSubjectIdToSubjectString(subjectOptions, s),
  );

  return {
    ruleId,
    description: policyRule.description,
    subject: subject,
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
  const existingSubjectIds = subjects.map((subject) => subject.subjectId);
  const copiedSubjects = ObjectUtils.deepCopy(subjects);

  rules.forEach((rule) => {
    rule.subject.forEach((subjectString) => {
      const subjectId = convertSubjectStringToSubjectId(subjectString);
      if (!existingSubjectIds.includes(subjectId.toLowerCase())) {
        const newSubject: PolicySubject = createNewSubjectFromSubjectString(subjectString);
        copiedSubjects.push(newSubject);
        existingSubjectIds.push(subjectId);
      }
    });
  });

  return copiedSubjects;
};

export const convertSubjectStringToSubjectId = (subjectString: string): string => {
  const lastColonIndex = subjectString.lastIndexOf(':');
  // The final element is the id
  return subjectString.slice(lastColonIndex + 1);
};

export const createNewSubjectFromSubjectString = (subjectString: string): PolicySubject => {
  const subjectId: string = convertSubjectStringToSubjectId(subjectString);
  return {
    subjectId: subjectId.toLowerCase(),
    subjectTitle: subjectId,
    subjectSource: convertSubjectStringToSubjectSource(subjectString),
    subjectDescription: '',
  };
};

export const convertSubjectStringToSubjectSource = (subjectString: string): string => {
  const firstColonIndex = subjectString.indexOf(':');
  const lastColonIndex = subjectString.lastIndexOf(':');
  // Starting at 1 to remove 'urn', and excluding the final to remove the id
  return subjectString.slice(firstColonIndex + 1, lastColonIndex);
};

export const findSubjectByPolicyRuleSubject = (
  subjectOptions: PolicySubject[],
  policyRuleSubject: string,
): PolicySubject => {
  return subjectOptions.find(
    (subject) => subject.subjectId.toLowerCase() === policyRuleSubject.toLowerCase(),
  );
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
