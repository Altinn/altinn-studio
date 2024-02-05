import { deepCopy } from 'app-shared/pure';
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
  description: '',
};

/**
 * Maps the list of policy subject strings from backend of the format
 * "subjectID:subjectResource" to the title of the subject.
 *
 * @param subjectOptions the possible subjects to select from
 * @param policySubjects the already selected subjects
 *
 * @returns a mapped string[] with subject titles
 */
export const mapPolicySubjectToSubjectTitle = (
  subjectOptions: PolicySubject[],
  policySubjects: string[],
): string[] => {
  const subjectIds = policySubjects.map((s) => {
    const splitted = s.split(':');
    return splitted[splitted.length - 1];
  });
  return subjectIds.map((subjectId) => {
    const subjectOption = findSubjectOptionBySubjectId(subjectOptions, subjectId);

    return subjectOption?.subjectTitle || subjectId;
  });
};
const findSubjectOptionBySubjectId = (
  subjectOptions: PolicySubject[],
  subjectId: string,
): PolicySubject => subjectOptions.find((s) => s.subjectId === subjectId.trim()); // .trim() is added to make sure there is no additional whitespace on the ID before it's being checked.

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

/**
 * Maps the policy rules object from backend to an object of the type used to
 * display data on the policy cards on the policy editor.
 *
 * @param subjectOptions the possible subjects to select from
 * @param rules an array of rule objects where all elements are strings from backend.
 *
 * @returns a list of mapped objects of the policy rule card type
 */
export const mapPolicyRulesBackendObjectToPolicyRuleCard = (
  subjectOptions: PolicySubject[],
  actionOptions: PolicyAction[],
  rules: PolicyRule[],
): PolicyRuleCard[] => {
  const newRules = rules.map((r) => {
    const idArr = r.ruleId.split(':');
    const id = idArr[idArr.length - 1];

    const mappedResources = r.resources.map((resource) =>
      resource.map((resource) => mapResourceFromBackendToResource(resource)),
    );

    const subjectTitles = mapPolicySubjectToSubjectTitle(subjectOptions, r.subject);

    return {
      ruleId: id,
      actions: r.actions,
      description: r.description,
      subject: subjectTitles,
      resources: mappedResources,
    };
  });
  return newRules;
};

/**
 * Maps a Subject title to the string format to send to backend: "urn:subjectsource:subjectid"
 *
 * @param subjectOptions the possible subjects to select from
 * @param subjectTitle the title of the subject
 *
 * @returns a string of the correct format to send
 */
export const mapSubjectTitleToSubjectString = (
  subjectOptions: PolicySubject[],
  subjectTitle: string,
): string => {
  const subject: PolicySubject = subjectOptions.find(
    (s) => s.subjectTitle.toLowerCase() === subjectTitle.toLowerCase(),
  );
  if (subject === undefined) return;
  return `urn:${subject?.subjectSource}:${subject?.subjectId}`;
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

  const subject: string[] = policyRule.subject.map(
    (s) => s && mapSubjectTitleToSubjectString(subjectOptions, s),
  );

  return {
    ruleId,
    description: policyRule.description,
    subject: subject,
    actions: policyRule.actions,
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
  const copiedActions = deepCopy(actions);

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
  const copiedSubjects = deepCopy(subjects);

  rules.forEach((rule) => {
    rule.subject.forEach((subjectString) => {
      const subjectId = convertSubjectStringToSubjectId(subjectString);
      if (!existingSubjectIds.includes(subjectId?.toLowerCase())) {
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
    subjectId: subjectId,
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
