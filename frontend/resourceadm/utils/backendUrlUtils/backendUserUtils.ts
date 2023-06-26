const basePath = 'http://studio.localhost/designer/api'

/**
 * Gets the URL path to the API for policies
 *
 * @param selectedContext the organisation
 * @param repo the repo
 * @param resourceId the id of the resource
 *
 * @returns the url path string
 */
export const getPolicyUrlBySelectedContextRepoAndId = (
  selectedContext: string,
  repo: string,
  resourceId: string
): string => {
  return `${basePath}/${selectedContext}/${repo}/policy/${resourceId}`
}

/**
 * Gets the URL path to the API for validating a policy
 *
 * @param selectedContext the organisation
 * @param repo the repo
 * @param resourceId the id of the resource
 *
 * @returns the url path string
 */
export const getValidatePolicyUrlBySelectedContextRepoAndId = (
  selectedContext: string,
  repo: string,
  resourceId: string
): string => {
  return `${basePath}/${selectedContext}/${repo}/policy/validate/${resourceId}`
}

/**
 * Gets the URL path to the API for the subject options for a policy
 *
 * @param selectedContext the organisation
 * @param repo the repo
 *
 * @returns the url path string
 */
export const getSubjectOptionsUrlBySelectedContextAndRepo = (
  selectedContext: string,
  repo: string
): string => {
  return `${basePath}/${selectedContext}/${repo}/policy/subjectoptions`
}

/**
 * Gets the URL path to the API for the action options for a policy
 *
 * @param selectedContext the organisation
 * @param repo the repo
 *
 * @returns the url path string
 */
export const getActionOptionsUrlBySelectedContextAndRepo = (
  selectedContext: string,
  repo: string
): string => {
  return `${basePath}/${selectedContext}/${repo}/policy/actionoptions`
}

/**
 * Gets the URL path to the API for the list of all resources
 *
 * @param selectedContext the organisation
 *
 * @returns the url path string
 */
export const getResourcesUrlBySelectedContext = (
  selectedContext: string
): string => {
  return `${basePath}/${selectedContext}/resources/repository/resourcelist`
}

/**
 * Gets the URL path to the API fora single resource
 *
 * @param selectedContext the organisation
 * @param id the id of the selected resource
 *
 * @returns the url path string
 */
export const getResourceUrlBySelectedContextRepoAndId = (
  selectedContext: string,
  repo: string,
  id: string
): string => {
  return `${basePath}/${selectedContext}/resources/repository/${repo}/${id}`
}

/**
 * Gets the URL path to the API for the creation of a new resource
 *
 * @param selectedContext the organisation
 *
 * @returns the url path string
 */
export const getCreateResourceUrlBySelectedContext = (
  selectedContext: string
): string => {
  return `${basePath}/${selectedContext}/resources/repository/addresource`
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
export const getValidateResourceUrlBySelectedContextRepoAndId = (
  selectedContext: string,
  repo: string,
  resourceId: string
): string => {
  return `${basePath}/${selectedContext}/resources/repository/validate/${repo}/${resourceId}`
}
