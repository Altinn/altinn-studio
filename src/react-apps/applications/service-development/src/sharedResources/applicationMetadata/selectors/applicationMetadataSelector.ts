import { createSelector } from 'reselect';

const applicationMetadataSelector = (state: IServiceDevelopmentState) => {
  return state.applicationMetadata.applicationMetadata;
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
