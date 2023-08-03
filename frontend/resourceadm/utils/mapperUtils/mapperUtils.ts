import { PolicyBackendType, ResourceType } from "resourceadm/types/global";

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
export const sortResourceListByDateAndMap = (resourceList: ResourceType[]): ResourceType[] => {

  const sorted =  resourceList.sort((a, b) => {
    return new Date(b.lastChanged).getTime() - new Date(a.lastChanged).getTime()
  })

  return sorted.map(r => ({
    ...r,
    lastChanged: formatDateFromBackendToDDMMYYYY(r.lastChanged),
  }))
}
