const basePath = 'http://studio.localhost/designer/api'

export const getPolicyRulesUrl = (org: string, repo: string, resourceId: string) => {
  return `${basePath}/${org}/${repo}/policy/${resourceId}`
}
