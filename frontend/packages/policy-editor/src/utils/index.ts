import {
  PolicyActionType,
  PolicyRuleBackendType,
  PolicyRuleCardType,
  PolicyRuleResourceType,
  PolicySubjectType,
} from '../types';

/**
 * Empty rule when new card added
 */
export const emptyPolicyRule: PolicyRuleCardType = {
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
 * @param policySubjects the already selected sujects
 *
 * @returns a mapped string[] with subject titles
 */
export const mapPolicySubjectToSubjectTitle = (
  subjectOptions: PolicySubjectType[],
  policySubjects: string[]
): string[] => {
  const subjectIds = policySubjects.map((s) => {
    const splitted = s.split(':');
    return splitted[splitted.length - 1];
  });

  return subjectIds.map((subjectId) => {
    if (subjectOptions.map((s) => s.subjectId).includes(subjectId)) {
      return subjectOptions.find((s) => s.subjectId === subjectId).subjectTitle;
    }
  });
};

/**
 * Maps the resource string from backend to a resource object with type and id.
 *
 * @param resource the resoruce string to map
 *
 * @returns a mapped resource object
 */
export const mapResourceFromBackendToResourceType = (resource: string): PolicyRuleResourceType => {
  const resourceArr = resource.split(':');
  const id: string = resourceArr.pop();
  const type: string = resourceArr.join(':');

  return {
    type: type,
    id: id,
  };
};

const mapPolicyActionsToActionTitle = (
  actionOptions: PolicyActionType[],
  actionIds: string[]
): string[] => {
  return actionIds.map((aId) => actionOptions.find((a) => aId === a.actionId).actionTitle);
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
export const mapPolicyRulesBackendObjectToPolicyRuleCardType = (
  subjectOptions: PolicySubjectType[],
  actionOptions: PolicyActionType[],
  rules: PolicyRuleBackendType[]
): PolicyRuleCardType[] => {
  const newRules = rules.map((r) => {
    const idArr = r.ruleId.split(':');
    const id = idArr[idArr.length - 1];

    const mappedResources = r.resources.map((resource) =>
      resource.map((r) => mapResourceFromBackendToResourceType(r))
    );

    const actionTitles = mapPolicyActionsToActionTitle(actionOptions, r.actions);

    return {
      ruleId: id,
      actions: actionTitles,
      description: r.description,
      subject: mapPolicySubjectToSubjectTitle(subjectOptions, r.subject),
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
  subjectOptions: PolicySubjectType[],
  subjectTitle: string
): string => {
  const subject: PolicySubjectType = subjectOptions.find((s) => s.subjectTitle === subjectTitle);
  return `urn:${subject.subjectSource}:${subject.subjectId}`;
};

/**
 * Maps a Action title to the action id
 *
 * @param actionOptions the possible actions to select from
 * @param actionTitle the title of the action
 *
 * @returns a string of the correct format to send
 */
export const mapActionTitleToActionId = (
  actionOptions: PolicyActionType[],
  actionTitle: string
): string => {
  return actionOptions.find((a) => a.actionTitle === actionTitle).actionId;
};

/**
 * Maps a policy rule object used on the policy cards to a policy rule object
 * to be sent to backend where all fields are strings.
 *
 * @param subjectOptions the possible subjects to select from
 * @param actionOptions the possible actions to select from
 * @param policyRule the policy rule to map
 * @param resourceType the type of the parent resource
 * @param resourceId the id of the parent resource
 *
 * @returns a mapped object ready to be sent to backend
 */
export const mapPolicyRuleToPolicyRuleBackendObject = (
  subjectOptions: PolicySubjectType[],
  actionOptions: PolicyActionType[],
  policyRule: PolicyRuleCardType,
  ruleId: string
): PolicyRuleBackendType => {
  const resources: string[][] = policyRule.resources.map((resource) =>
    resource
      .filter((r) => r.id !== '' && r.type !== '')
      .map((r) => (r.type.startsWith('urn:') ? `${r.type}:${r.id}` : `urn:${r.type}:${r.id}`))
  );

  const subject: string[] = policyRule.subject.map((s) =>
    mapSubjectTitleToSubjectString(subjectOptions, s)
  );
  const actions: string[] = policyRule.actions.map((a) =>
    mapActionTitleToActionId(actionOptions, a)
  );

  return {
    ruleId,
    description: policyRule.description,
    subject: subject,
    actions: actions,
    resources: resources,
  };
};
