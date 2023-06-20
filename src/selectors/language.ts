import { createSelector } from 'reselect';

import { staticUseLanguageFromState } from 'src/hooks/useLanguage';
import { getAppName, getAppOwner, getAppReceiver } from 'src/language/sharedLanguage';
import type { IRuntimeState } from 'src/types';

const selectApplicationMetadata = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;
const selectAllOrgs = (state: IRuntimeState) => state.organisationMetaData.allOrgs;
const selectOrg = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata?.org;
const selectLangTools = (state: IRuntimeState) => staticUseLanguageFromState(state);

export const selectAppName = createSelector(selectApplicationMetadata, selectLangTools, getAppName);
export const selectAppOwner = createSelector(selectAllOrgs, selectOrg, selectLangTools, getAppOwner);
export const selectAppReceiver = createSelector(selectAllOrgs, selectOrg, selectLangTools, getAppReceiver);
