import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { Form, FormFirstPage } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { NavigateToStartUrl, ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { Entrypoint } from 'src/features/entrypoint/Entrypoint';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { PartySelection } from 'src/features/instantiate/containers/PartySelection';
import { InstanceSelectionWrapper } from 'src/features/instantiate/selection/InstanceSelection';
import { CustomReceipt, DefaultReceipt } from 'src/features/receipt/ReceiptContainer';
import { TaskKeys } from 'src/hooks/useNavigatePage';
import { PresentationType } from 'src/types';

export const App = () => (
  <Routes>
    <Route element={<Entrypoint />}>
      <Route
        path=':pageKey'
        element={
          <PresentationComponent type={PresentationType.Stateless}>
            <Form />
          </PresentationComponent>
        }
      />
      <Route
        index
        element={<FormFirstPage />}
      />
    </Route>
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
          <Outlet />
        </InstanceProvider>
      }
    >
      <Route
        path=':taskId/*'
        element={<ProcessWrapper />}
      />
      <Route
        path={TaskKeys.ProcessEnd}
        element={<DefaultReceipt />}
      />
      <Route path={TaskKeys.CustomReceipt}>
        <Route
          path='*'
          element={<CustomReceipt />}
        />
      </Route>
      <Route
        index
        element={<NavigateToStartUrl />}
      />
    </Route>

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
