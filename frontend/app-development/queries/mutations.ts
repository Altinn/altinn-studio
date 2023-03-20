import { del, post, put } from 'app-shared/utils/networking';
import {
  releasesPath,
  deploymentsPath,
  repoPushPath,
  repoCommitPath,
  textResourcesPath,
  textResourceIdsPath,
} from 'app-shared/api-paths';

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

export const updateTranslationByLangCode = (org, app, langCode, payload) =>
  post(textResourcesPath(org, app, langCode), payload);

export const updateTextId = (org, app, payload) => put(textResourceIdsPath(org, app), payload);

export const addLanguageCode = (org, app, langCode, payload) =>
  post(textResourcesPath(org, app, langCode), payload);

export const deleteLanguageCode = (org, app, langCode) =>
  del(textResourcesPath(org, app, langCode));
