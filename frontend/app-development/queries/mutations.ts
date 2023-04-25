import { del, post, put } from 'app-shared/utils/networking';
import {
  releasesPath,
  deploymentsPath,
  repoPushPath,
  repoCommitPath,
  textResourcesPath,
  textResourceIdsPath,
  formLayoutPath,
  appMetadataAttachmentPath,
  formLayoutNamePath,
  layoutSettingsPath,
} from 'app-shared/api-paths';
import { ITextResourcesObjectFormat } from 'app-shared/types/global';

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

export const upsertTextResources = (org: string, app: string, language: string, payload: ITextResourcesObjectFormat) =>
  put(textResourcesPath(org, app, language), payload);

export const saveFormLayout = (org, app, layoutName, payload) =>
  post(formLayoutPath(org, app, layoutName), payload);

export const addAppAttachmentMetadata = (org, app, payload) =>
  post(appMetadataAttachmentPath(org, app), payload);

export const deleteAppAttachmentMetadata = (org, app, id) =>
  del(appMetadataAttachmentPath(org, app), { headers, data: id });

export const updateAppAttachmentMetadata = (org, app, payload) =>
  post(appMetadataAttachmentPath(org, app), payload);

export const updateFormLayoutName = (org, app, oldName, newName) =>
  post(formLayoutNamePath(org, app, oldName), JSON.stringify(newName), {
    headers: { 'Content-Type': 'application/json' }
  });

export const deleteFormLayout = (org, app, layoutName) =>
  del(formLayoutPath(org, app, layoutName));

export const saveFormLayoutSettings = (org, app, payload) =>
  post(layoutSettingsPath(org, app), payload);
