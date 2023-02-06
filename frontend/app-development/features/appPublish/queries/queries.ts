import { get } from 'app-shared/utils/networking';
import { frontendLangPath, repoStatusPath } from 'app-shared/api-paths';
import { orgsListUrl } from 'app-shared/cdn-paths';
import { fetchDeployPermissionsUrl } from '../../../utils/urlHelper';

export const getRepoStatus = (app, owner) => get(repoStatusPath(app, owner));

export const getOrgList = () => get(orgsListUrl());

export const getDeployPermissions = (app, owner) => get(fetchDeployPermissionsUrl);

export const getFrontendLang = (locale: string) => get(frontendLangPath(locale));
