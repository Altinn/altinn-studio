import { PolicyActionType, PolicyBackendType, PolicySubjectType } from "resourceadm/types/global";

/**
 * Maps from an uknown response object from backend to the correct policy type
 *
 * @param res the unknown response
 *
 * @returns a mapped policy backend type
 */
export const mapPolicyResultToPolicyObject = (
  res: unknown
): PolicyBackendType => {
  const policyResult: PolicyBackendType = res as PolicyBackendType;
  return {
    rules: policyResult.rules ?? [],
    requiredAuthenticationLevelEndUser: '3',
    requiredAuthenticationLevelOrg: '3',
  };
};

/**
 * Maps from an uknown response object from backend to the correct list of action type
 *
 * @param res the unknown response
 *
 * @returns a list of mapped policy action type
 */
export const mapPolicyActionResultToPolicyActions = (
  res: unknown
): PolicyActionType[] => {
  const actionResult: PolicyActionType[] = res as PolicyActionType[];
  return actionResult
}

/**
 * Maps from an uknown response object from backend to the correct list of subject type
 *
 * @param res the unknown response
 *
 * @returns a list of mapped policy subject type
 */
export const mapPolicySubjectResultToPolicySubjects = (
  res: unknown
): PolicySubjectType[] =>{
  const subjectsResult: PolicySubjectType[] = res as PolicySubjectType[];
  return subjectsResult
}
