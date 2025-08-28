import type { PolicyAction, PolicyRuleCard, PolicySubject } from '../../types';

/**
 * Function to update the fields inside the rule object in the rule array.
 * This function has to be called every time an element inside the card is
 * changing so that the parent component knows that the child element is changed.
 * It also updates the complete list of policy rules.
 *
 * @param description the description
 * @param subjectTitles the selected subjectTitle array
 * @param actiontTitles the selected actions array
 * @param policyRuleResources the selected resources array
 * @param policyRuleId the id of the policy rule
 * @param currentRules list of current rules
 *
 * @returns a list of PolicyRuleCard with the updates rules
 */
export const getUpdatedRules = (
  updatedRule: PolicyRuleCard,
  policyRuleId: string,
  currentRules: PolicyRuleCard[],
): PolicyRuleCard[] => {
  const updatedRules = [...currentRules];
  const ruleIndex = currentRules.findIndex((rule) => rule.ruleId === policyRuleId);

  updatedRules[ruleIndex] = updatedRule;

  return updatedRules;
};

/**
 * Maps the subject objects to option objects for display in the select component
 *
 * @param subjects the list of possible subjects
 * @param policyRule the currect policy rule
 *
 * @returns a list of select options with value and label
 */
export const getSubjectOptions = (subjects: PolicySubject[], policyRule: PolicyRuleCard) => {
  return subjects
    .filter((s) => !policyRule.subject.includes(s.subjectId))
    .map((s) => ({ value: s.subjectId, label: s.subjectTitle }));
};

/**
 * Maps the action objects to option objects for display in the select component
 *
 * @param actions the list of possible actions
 * @param policyRule the current policy rule
 *
 * @returns a list of select options with value and label
 */
export const getActionOptions = (actions: PolicyAction[], policyRule: PolicyRuleCard) => {
  return actions
    .filter((a) => !policyRule.actions.includes(a.actionId))
    .map((a) => ({ value: a.actionId, label: a.actionId }));
};

/**
 * Gets the id of the policy
 *
 * @param policyRule the policyRule
 *
 * @returns the id
 */
export const getPolicyRuleIdString = (policyRule: PolicyRuleCard) => {
  return policyRule.ruleId.toString();
};
