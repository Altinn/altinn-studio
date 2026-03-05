import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';

import { AppLayout } from 'src/AppLayout';
import { ErrorPage } from 'src/components/ErrorPage';
import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { ComponentRouting, NavigateToStartUrl, ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { Entrypoint } from 'src/features/entrypoint/Entrypoint';
import { FormProvider } from 'src/features/form/FormContext';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { PartySelection } from 'src/features/instantiate/containers/PartySelection';
import { InstanceSelectionWrapper } from 'src/features/instantiate/selection/InstanceSelection';
import { PdfWrapper } from 'src/features/pdf/PdfWrapper';
import { FixWrongReceiptType } from 'src/features/receipt/FixWrongReceiptType';
import { DefaultReceipt } from 'src/features/receipt/ReceiptContainer';
import { GlobalData } from 'src/GlobalData';
import { routes } from 'src/routesBuilder';

export function createRouter() {
  return createBrowserRouter(
    [
      {
        Component: AppLayout,
        errorElement: <ErrorPage />,
        children: [
          { path: routes.instanceSelection, element: <InstanceSelectionWrapper /> },
          {
            path: routes.partySelection,
            children: [
              { index: true, element: <PartySelection /> },
              { path: '*', element: <PartySelection /> },
            ],
          },
          {
            element: <Entrypoint />,
            children: [
              {
                path: routes.statelessPage,
                Component: () => (
                  <PresentationComponent>
                    <Form />
                  </PresentationComponent>
                ),
              },
              { index: true, element: <NavigateToStartUrl forceCurrentTask={false} /> },
            ],
          },
          {
            path: routes.instance,
            Component: () => (
              <InstanceProvider>
                <Outlet />
              </InstanceProvider>
            ),
            children: [
              { index: true, element: <NavigateToStartUrl /> },
              { path: 'ProcessEnd', element: <DefaultReceipt /> },
              {
                path: routes.task,
                Component: () => (
                  <FixWrongReceiptType>
                    <ProcessWrapper>
                      <FormProvider>
                        <Outlet />
                      </FormProvider>
                    </ProcessWrapper>
                  </FixWrongReceiptType>
                ),
                children: [
                  { index: true, element: <NavigateToStartUrl forceCurrentTask={false} /> },
                  {
                    path: routes.page,
                    children: [
                      {
                        index: true,
                        Component: () => (
                          <PdfWrapper>
                            <PresentationComponent>
                              <Form />
                            </PresentationComponent>
                          </PdfWrapper>
                        ),
                      },
                      {
                        path: routes.component,
                        children: [
                          { index: true, element: <ComponentRouting /> },
                          { path: '*', element: <ComponentRouting /> },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: routes.partySelectionLegacy,
        children: [
          {
            index: true,
            element: (
              <Navigate
                to='/party-selection'
                replace
              />
            ),
          },
          {
            path: '*',
            element: (
              <Navigate
                to='/party-selection'
                replace
              />
            ),
          },
        ],
      },
    ],
    {
      basename: GlobalData.basename,
    },
  );
}
