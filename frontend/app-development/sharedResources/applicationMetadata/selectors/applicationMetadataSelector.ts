import type { RootState } from '../../../store';

export const applicationMetadataSelector = (state: RootState) => {
  return state.applicationMetadataState?.applicationMetadata;
};
