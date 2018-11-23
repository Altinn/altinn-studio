import { createSelector } from 'reselect';

const apiSelector = (state: IAppState) => {
  return state.serviceConfigurations.APIs;
};

const getApiConnections = () => {
  return createSelector(
    [apiSelector],
    (apis: any) => {
      return apis.connections;
    },
  );
};

export const makeGetApiConnectionsSelector = getApiConnections;
