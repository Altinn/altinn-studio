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
export const getPolicyUrl = (
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
export const getValidatePolicyUrl = (
  selectedContext: string,
  repo: string,
  resourceId: string
): string => {
  return `${basePath}/${selectedContext}/${repo}/policy/validate/${resourceId}`
}

/**
 * Gets the URL path to the API for getting the publish statuses
 *
 * @param selectedContext the organisation
 * @param repo the repo
 * @param resourceId the id of the resource
 *
 * @returns the url path string
 */
export const getPublishStatusUrl = (
  selectedContext: string,
  repo: string,
  resourceId: string
): string => {
  return `${basePath}/${selectedContext}/resources/publishstatus/${repo}/${resourceId}`
}

/**
 * Gets the URL path to the API for the subject options for a policy
 *
 * @param selectedContext the organisation
 * @param repo the repo
 *
 * @returns the url path string
 */
export const getSubjectOptionsUrl = (
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
export const getActionOptionsUrl = (
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
export const getResourcesUrl = (
  selectedContext: string
): string => {
  return `${basePath}/${selectedContext}/resources/resourcelist`
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
 * Gets the URL path to the API for the creation of a new resource
 *
 * @param selectedContext the organisation
 *
 * @returns the url path string
 */
export const getCreateResourceUrl = (
  selectedContext: string
): string => {
  return `${basePath}/${selectedContext}/resources/addresource`
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
