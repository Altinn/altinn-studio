import { del, post, put } from 'app-shared/utils/networking';
import {
  releasesPath,
  deploymentsPath,
  repoPushPath,
  repoCommitPath,
  textResourcesPath,
  textResourceIdsPath,
} from 'app-shared/api-paths';

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export const createRelease = (org, app, payload) => post(releasesPath(org, app), payload);

export const createDeployment = (org, app, payload) => post(deploymentsPath(org, app), payload);

export const pushRepoChanges = (org, app) => post(repoPushPath(org, app));

export const createRepoCommit = (org, app, payload) =>
  post(repoCommitPath(org, app), payload, { headers });

export const updateTranslationByLangCode = (org, app, language, payload) =>
  post(textResourcesPath(org, app, language), payload);

export const updateTextId = (org, app, payload) => put(textResourceIdsPath(org, app), payload);

export const addLanguageCode = (org, app, language, payload) =>
  post(textResourcesPath(org, app, language), payload);

export const deleteLanguageCode = (org, app, language) =>
  del(textResourcesPath(org, app, language));

export const upsertTextResources = (org, app, language, payload) =>
  put(textResourcesPath(org, app, language), payload);
