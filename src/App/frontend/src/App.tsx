import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { ComponentRouting, ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { Entrypoint } from 'src/features/entrypoint/Entrypoint';
import { FormProvider } from 'src/features/form/FormContext';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { PDFWrapper } from 'src/features/pdf/PDFWrapper';
import { FixWrongReceiptType } from 'src/features/receipt/FixWrongReceiptType';
import { DefaultReceipt } from 'src/features/receipt/ReceiptContainer';
import { TaskKeys } from 'src/hooks/useNavigatePage';

export const App = () => (
  <Routes>
    <Route element={<Entrypoint />}>
      <Route
        path=':pageKey'
        element={
          <PresentationComponent>
            <Form />
          </PresentationComponent>
        }
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
