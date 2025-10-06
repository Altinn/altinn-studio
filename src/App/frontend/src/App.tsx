import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { ComponentRouting, NavigateToStartUrl, ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { Entrypoint } from 'src/features/entrypoint/Entrypoint';
import { FormProvider } from 'src/features/form/FormContext';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { PartySelection } from 'src/features/instantiate/containers/PartySelection';
import { InstanceSelectionWrapper } from 'src/features/instantiate/selection/InstanceSelection';
import { PDFWrapper } from 'src/features/pdf/PDFWrapper';
import { FixWrongReceiptType } from 'src/features/receipt/FixWrongReceiptType';
import { DefaultReceipt } from 'src/features/receipt/ReceiptContainer';
import { TaskKeys } from 'src/hooks/useNavigatePage';

export const App = () => (
  <Routes>
    <Route
      path='/instance-selection'
      element={<InstanceSelectionWrapper />}
    />
    <Route path='/party-selection'>
      <Route
        index
        element={<PartySelection />}
      />
      <Route
        path='*'
        element={<PartySelection />}
      />
    </Route>
    <Route element={<Entrypoint />}>
      <Route
        path=':pageKey'
        element={
          <PresentationComponent>
            <Form />
          </PresentationComponent>
        }
      />
      <Route
        index
        element={<NavigateToStartUrl forceCurrentTask={false} />}
      />
    </Route>

    <Route
      path='/instance/:instanceOwnerPartyId/:instanceGuid'
      element={
        <InstanceProvider>
          <Outlet />
        </InstanceProvider>
      }
    >
      <Route
        index
        element={<NavigateToStartUrl />}
      />

      <Route
        path={TaskKeys.ProcessEnd}
        element={<DefaultReceipt />}
      />

      <Route
        path=':taskId'
        element={
          <FixWrongReceiptType>
            <ProcessWrapper>
              <FormProvider>
                <Outlet />
              </FormProvider>
            </ProcessWrapper>
          </FixWrongReceiptType>
        }
      >
        <Route
          index
          element={<NavigateToStartUrl forceCurrentTask={false} />}
        />
        <Route path=':pageKey'>
          <Route
            index
            element={
              <PDFWrapper>
                <PresentationComponent>
                  <Form />
                </PresentationComponent>
              </PDFWrapper>
            }
          />
          <Route path=':componentId'>
            <Route
              index
              element={<ComponentRouting />}
            />
            <Route
              path='*'
              element={<ComponentRouting />}
            />
          </Route>
        </Route>
      </Route>

      <Route
        path='*'
        element={<NavigateToStartUrl />}
      />
    </Route>

    {/**
     * Redirects from legacy URLs to new URLs
     */}
    <Route path='/partyselection'>
      <Route
        index
        element={
          <Navigate
            to='/party-selection/'
            replace={true}
          />
        }
      />

      <Route
        path='*'
        element={
          <Navigate
            to='/party-selection/'
            replace={true}
          />
        }
      />
    </Route>
  </Routes>
);
