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
 * Gets the URL path to the API fora single resource
 *
 * @param selectedContext the organisation
 * @param id the id of the selected resource
 *
 * @returns the url path string
 */
export const getResourceUrl = (
  selectedContext: string,
  repo: string,
  id: string
): string => {
  return `${basePath}/${selectedContext}/resources/${repo}/${id}`
}

/**
 * Gets the URL path to the API for the editing of an exisitng resource
 *
 * @param selectedContext the organisation
 * @param id the id of the resource
 *
 * @returns the url path string
 */
export const getEditResourceUrl = (
  selectedContext: string,
  id: string
): string => {
  return `${basePath}/${selectedContext}/resources/updateresource/${id}`
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
