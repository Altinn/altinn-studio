import { PolicyActionType, PolicyBackendType, PolicyErrorType, PolicyRuleErrorType, PolicySubjectType, ResourceType } from "resourceadm/types/global";

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

/**
 * Maps from an uknown response object from backend to the correct list of resource type
 *
 * @param res the unknown response
 *
 * @returns a list of mapped resource type
 */
export const mapResourceListBackendResultToResourceList = (
  res: unknown
): ResourceType[] => {
  // TODO - Find out the type it should be assigned as, and how to handle the languages
  const resourcesResult: any[] = res as any[];

  return sortByDateAndMap(resourcesResult);
}

/**
 * Maps a string from the format sent from backend, e.g.,
 * '2023-06-14T13:35:00+02:00' to dd.mm.yyyy.
 *
 * @param dateString the string to map
 *
 * @returns a formatted date
 */
const formatDateFromBackendToDDMMYYYY = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString().replaceAll('/', '.');
}

/**
 * Sorts a resource list by the date so the newest is at the top, then maps
 * the object correctly.
 *
 * @param resourceList the list to sort and map
 *
 * @returns the sorted and mapped list
 */
const sortByDateAndMap = (resourceList: any[]): ResourceType[] => {

  const sorted =  resourceList.sort((a, b) => {
    return new Date(b.lastChanged).getTime() - new Date(a.lastChanged).getTime()
  })

  return sorted.map(r => ({
    ...r,
    lastChanged: formatDateFromBackendToDDMMYYYY(r.lastChanged),
    title: r.title.nb // TODO
  }))
}

/**
 * Maps a policy error object from backend to a list of the PolicyErrorType.
 *
 * @param errorObj the unknown object to map
 *
 * @returns a list of objects of type PolicyErrorType
 */
export const mapPolicyErrorsFromBackend = (errorObj: unknown): PolicyErrorType[] => {
  // If errorObj or errorObj.errors is not object type, return empty list
  if (!(
    typeof errorObj === 'object' &&
    'errors' in errorObj &&
    typeof errorObj.errors === 'object'
  )) {
    return []
  }

  // Map the object and return it
  return Object.keys(errorObj.errors).map((key) => {
    const ruleNumber = Number(key.split("[")[1].replace("]", "")) + 1;
    const errors: PolicyRuleErrorType[] = errorObj.errors[key]

    return {
      ruleNumber,
      errors
    };
  });
}
