import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { ComponentRouting, ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { Entrypoint } from 'src/features/entrypoint/Entrypoint';
import { FormProvider } from 'src/features/form/FormContext';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { PartySelection } from 'src/features/instantiate/containers/PartySelection';
import { PDFWrapper } from 'src/features/pdf/PDFWrapper';
import { CustomReceipt, DefaultReceipt } from 'src/features/receipt/ReceiptContainer';
import { TaskKeys } from 'src/hooks/useNavigatePage';
import { PresentationType, ProcessTaskType } from 'src/types';

// console.log(window.AltinnAppData);

export const App = () => (
  <Routes>
    {/*<Route*/}
    {/*  path='/instance-selection'*/}
    {/*  // element={<InstanceSelection />}*/}
    {/*  element={<h1>Instance selection</h1>}*/}
    {/*/>*/}
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
          <PresentationComponent type={PresentationType.Stateless}>
            <Form />
          </PresentationComponent>
        }
      />
      {/*<Route*/}
      {/*  index*/}
      {/*  element={<NavigateToStartUrl forceCurrentTask={false} />}*/}
      {/*/>*/}
    </Route>

    <Route
      path='/instance/:instanceOwnerPartyId/:instanceGuid'
      element={
        <InstanceProvider>
          <Outlet />
        </InstanceProvider>
      }
    >
      {/*<Route*/}
      {/*  index*/}
      {/*  element={<NavigateToStartUrl />}*/}
      {/*/>*/}

      <Route
        path={TaskKeys.ProcessEnd}
        element={<DefaultReceipt />}
      />

      <Route
        path={TaskKeys.CustomReceipt}
        element={
          <PresentationComponent
            type={ProcessTaskType.Archived}
            showNavigation={false}
          >
            <FormProvider>
              <CustomReceipt />
            </FormProvider>
          </PresentationComponent>
        }
      >
        {/*<Route*/}
        {/*  index*/}
        {/*  element={<NavigateToStartUrl forceCurrentTask={false} />}*/}
        {/*/>*/}
        <Route path=':pageKey'>
          <Route
            index
            element={
              <PDFWrapper>
                <Form />
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
        path=':taskId'
        element={
          <ProcessWrapper>
            <FormProvider>
              <Outlet />
            </FormProvider>
          </ProcessWrapper>
        }
      >
        {/*<Route*/}
        {/*  index*/}
        {/*  element={<NavigateToStartUrl forceCurrentTask={false} />}*/}
        {/*/>*/}
        <Route path=':pageKey'>
          <Route
            index
            element={
              <PDFWrapper>
                <PresentationComponent type={ProcessTaskType.Data}>
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

      {/*<Route*/}
      {/*  path='*'*/}
      {/*  element={<NavigateToStartUrl />}*/}
      {/*/>*/}
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
