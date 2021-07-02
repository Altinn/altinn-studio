import { createSelector } from 'reselect';

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
