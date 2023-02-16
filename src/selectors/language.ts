import { createSelector } from 'reselect';

import { getAppName, getAppOwner } from 'src/language/sharedLanguage';
import type { IRuntimeState } from 'src/types';

const selectTextResources = (state: IRuntimeState) => state.textResources.resources;
const selectApplicationMetadata = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;
const selectUserLanguage = (state: IRuntimeState) => state.profile.profile?.profileSettingPreference.language;
const selectAllOrgs = (state: IRuntimeState) => state.organisationMetaData.allOrgs;
const selectOrg = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata?.org;

export const selectAppName = createSelector(
  selectTextResources,
  selectApplicationMetadata,
  selectUserLanguage,
  (textResources, applicationMetadata, userLanguage) => getAppName(textResources, applicationMetadata, userLanguage),
);

export const selectAppOwner = createSelector(
  selectTextResources,
  selectAllOrgs,
  selectOrg,
  selectUserLanguage,
  (textResources, allOrgs, org, userLanguage) => getAppOwner(textResources, allOrgs, org, userLanguage),
);
