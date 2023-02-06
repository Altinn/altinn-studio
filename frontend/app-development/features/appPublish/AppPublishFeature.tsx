import React from 'react';
import { DeployPage } from './pages/deployPage';
import { ServicesContextProvider } from './contexts/ServiceContext';
import * as queries from './queries/queries';

export const AppPublishFeature = () => {
  return (
    <ServicesContextProvider {...queries}>
      <DeployPage />
    </ServicesContextProvider>
  );
};
