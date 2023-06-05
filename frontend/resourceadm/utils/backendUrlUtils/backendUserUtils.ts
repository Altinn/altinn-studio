const basePath = 'http://studio.localhost/designer/api'

export const getPolicyUrlByOrgRepoAndId = (org: string, repo: string, resourceId: string) => {
  return `${basePath}/${org}/${repo}/policy/${resourceId}`
}
