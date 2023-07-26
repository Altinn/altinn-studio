const basePath = 'http://studio.localhost/designer/api'

/**
 * Gets the URL path to the API for validating a policy
 *
 * @param selectedContext the organisation
 * @param repo the repo
 * @param resourceId the id of the resource
 *
 * @returns the url path string
 */
export const getValidatePolicyUrl = (
  selectedContext: string,
  repo: string,
  resourceId: string
): string => {
  return `${basePath}/${selectedContext}/${repo}/policy/validate/${resourceId}`
}

/**
 * Gets the URL path to the API for validating a resource
 *
 * @param selectedContext the organisation
 * @param repo the repo
 * @param resourceId the id of the resource
 *
 * @returns the url path string
 */
export const getValidateResourceUrl = (
  selectedContext: string,
  repo: string,
  resourceId: string
): string => {
  return `${basePath}/${selectedContext}/resources/validate/${repo}/${resourceId}`
}
