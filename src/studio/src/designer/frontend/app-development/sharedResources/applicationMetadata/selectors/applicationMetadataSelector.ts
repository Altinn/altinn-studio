import { createSelector } from 'reselect';
import { RootState } from '../../../store';

const applicationMetadataSelector = (state: RootState) => {
  return state.applicationMetadataState.applicationMetadata;
};

const getApplicationMetadata = () => {
  return createSelector(
    [applicationMetadataSelector],
    (applicationMetadata) => {
      return applicationMetadata;
    },
  );
};

export const makeGetApplicationMetadata = getApplicationMetadata;
