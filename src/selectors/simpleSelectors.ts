import type { IRuntimeState } from 'src/types';

export const appMetaDataSelector = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;
export const layoutSetsSelector = (state: IRuntimeState) => state.formLayout.layoutsets;
export const selectAllOrgs = (state: IRuntimeState) => state.organisationMetaData.allOrgs;
export const selectOrg = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata?.org;
export const selectAppLogoSize = (state: IRuntimeState) =>
  state.applicationMetadata.applicationMetadata?.logo?.size ?? 'small';
