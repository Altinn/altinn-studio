const basePath = 'http://studio.localhost/designer/api'

/**
 * Gets the URL path to the API for policies
 *
 * @param org the organisation
 * @param repo the repo
 * @param resourceId the id of the resource
 *
 * @returns the url path string
 */
export const getPolicyUrlByOrgRepoAndId = (
  org: string,
  repo: string,
  resourceId: string
): string => {
  return `${basePath}/${org}/${repo}/policy/${resourceId}`
}

/**
 * Gets the URL path to the API for the subject options for a policy
 *
 * @param org the organisation
 * @param repo the repo
 *
 * @returns the url path string
 */
export const getSubjectOptionsUrlByOrgAndRepo = (
  org: string,
  repo: string
): string => {
  return `${basePath}/${org}/${repo}/policy/subjectoptions`
}

/**
 * Gets the URL path to the API for the action options for a policy
 *
 * @param org the organisation
 * @param repo the repo
 *
 * @returns the url path string
 */
export const getActionOptionsUrlByOrgAndRepo = (
  org: string,
  repo: string
): string => {
  return `${basePath}/${org}/${repo}/policy/actionoptions`
}
