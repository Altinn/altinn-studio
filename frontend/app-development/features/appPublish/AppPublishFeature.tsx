import React from 'react';
import { DeployPage } from './pages/deployPage';
import { ServicesContextProvider } from './contexts/ServiceContext';
import * as queries from './queries/queries';
import * as mutations from './queries/mutations';

export const AppPublishFeature = () => {
  return (
    <ServicesContextProvider {...queries} {...mutations}>
      <DeployPage />
    </ServicesContextProvider>
  );
};
