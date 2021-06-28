import { createSelector } from 'reselect';
import { IApplicationMetadataState } from '../applicationMetadataSlice';

const applicationMetadataSelector = (state: IServiceDevelopmentState) => {
  return (state.repoMetadataState as IApplicationMetadataState).applicationMetadata;
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
