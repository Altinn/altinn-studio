import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { ProcessWrapperWrapper } from 'src/components/wrappers/ProcessWrapper';
import { Entrypoint } from 'src/features/entrypoint/Entrypoint';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { PartySelection } from 'src/features/instantiate/containers/PartySelection';
import { InstanceSelectionWrapper } from 'src/features/instantiate/selection/InstanceSelection';

export const App = () => (
  <Routes>
    <Route
      path={'*'}
      element={<Entrypoint />}
    />
    <Route
      path='/instance-selection/*'
      element={<InstanceSelectionWrapper />}
    />

    <Route
      path='/party-selection/*'
      element={<PartySelection />}
    />

    <Route
      path='/instance/:partyId/:instanceGuid/*'
      element={
        <InstanceProvider>
          <ProcessWrapperWrapper />
        </InstanceProvider>
      }
    />

    {/**
     * Redirects from legacy URLs to new URLs
     */}
    <Route
      path='/partyselection/*'
      element={
        <Navigate
          to='/party-selection/'
          replace={true}
        />
      }
    />
  </Routes>
);
