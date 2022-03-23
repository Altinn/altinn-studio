import { createSelector } from 'reselect';
import type { IServiceDevelopmentState } from '../../../types/global';

const applicationMetadataSelector = (state: IServiceDevelopmentState) => {
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
