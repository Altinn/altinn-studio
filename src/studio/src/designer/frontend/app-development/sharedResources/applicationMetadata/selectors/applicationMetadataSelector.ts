import { createSelector } from 'reselect';
import type { RootState } from '../../../store';

const applicationMetadataSelector = (state: RootState) => {
  return state.applicationMetadataState.applicationMetadata;
};

const getApplicationMetadata = () => {
  return createSelector([applicationMetadataSelector], (applicationMetadata) => {
    return applicationMetadata;
  });
};

export const makeGetApplicationMetadata = getApplicationMetadata;
