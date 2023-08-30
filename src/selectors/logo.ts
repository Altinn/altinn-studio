import { createSelector } from 'reselect';

import {
  getAppLogoAltText,
  getAppLogoUrl,
  getdisplayAppOwnerNameInHeader,
  getUseAppLogoOrgSource,
} from 'src/language/sharedLanguage';
import { selectLangTools } from 'src/selectors/language';
import { appMetaDataSelector, selectAllOrgs, selectOrg } from 'src/selectors/simpleSelectors';

export const selectUseAppLogoOrgSource = createSelector(appMetaDataSelector, getUseAppLogoOrgSource);
export const selectDisplayAppOwnerNameInHeader = createSelector(appMetaDataSelector, getdisplayAppOwnerNameInHeader);
export const selectAppLogoAltText = createSelector(selectAllOrgs, selectOrg, selectLangTools, getAppLogoAltText);
export const selectAppLogoUrl = createSelector(
  selectAllOrgs,
  selectOrg,
  selectLangTools,
  selectUseAppLogoOrgSource,
  getAppLogoUrl,
);
