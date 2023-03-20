import { post } from 'app-shared/utils/networking';
import { releasesPath, deploymentsPath, repoPushPath, repoCommitPath } from 'app-shared/api-paths';

export const createRelease = (org, app, payload) => post(releasesPath(org, app), payload);

export const createDeployment = (org, app, payload) => post(deploymentsPath(org, app), payload);

export const pushRepoChanges = (org, app) => post(repoPushPath(org, app));

export const createRepoCommit = (org, app, payload) =>
  post(repoCommitPath(org, app), payload, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
