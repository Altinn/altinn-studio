import { post } from 'app-shared/utils/networking';
import { appReleasesPath } from 'app-shared/api-paths';

// http://studio.localhost/designer/api/ttd/autodeploy-v3/releases
export const createRelease = (org, app, data) => post(appReleasesPath(org, app), data);
