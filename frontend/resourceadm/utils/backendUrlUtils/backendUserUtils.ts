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
