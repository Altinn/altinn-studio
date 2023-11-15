import { createSelector } from 'reselect';

import { staticUseLanguageFromState } from 'src/hooks/useLanguage';
import {
  getAppLogoAltText,
  getAppLogoUrl,
  getdisplayAppOwnerNameInHeader,
  getUseAppLogoOrgSource,
} from 'src/language/sharedLanguage';
import { appMetaDataSelector, selectAllOrgs, selectOrg } from 'src/selectors/simpleSelectors';
import type { IRuntimeState } from 'src/types';

export const selectLangTools = (state: IRuntimeState) => staticUseLanguageFromState(state);
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
