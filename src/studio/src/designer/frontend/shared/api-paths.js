export const frontendLangPath = (locale) => `/designer/frontend/lang/${locale}.json`;
export const orgsListPath = () => '/designer/api/v1/orgs';
export const repoSearchPath = () => '/designer/api/v1/repos/search';
export const reposList = (owner) => `/designer/api/v1/repos/${owner}`;
export const userCurrentPath = () => '/designer/api/v1/user/current';
export const userLogoutAfterPath = () => '/Home/Logout';
export const userLogoutPath = () => '/repos/user/logout';
export const userReposPath = () => '/designer/api/v1/user/repos';
export const userStarredListPath = () => '/designer/api/v1/user/starred';
export const userStarredRepoPath = (owner, repo) => `/designer/api/v1/user/starred/${owner}/${repo}`;
export const copyAppPath = (owner, sourceRepo, targetRepo) => `/designer/api/v1/repos/copyapp?org=${owner}&sourceRepository=${sourceRepo}&targetRepository=${targetRepo}`
