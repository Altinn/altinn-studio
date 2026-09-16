import React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import {
  ServicesContextProvider,
  type ServicesContextProps,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { BpmnContext, type BpmnContextProps } from '../src/contexts/BpmnContext';
import { BpmnApiContext, type BpmnApiContextProps } from '../src/contexts/BpmnApiContext';
import { mockBpmnApiContextValue, mockBpmnContextValue } from './mocks/bpmnContextMock';

export type ProviderProps = {
  bpmnContextProps?: Partial<BpmnContextProps>;
  bpmnApiContextProps?: Partial<BpmnApiContextProps>;
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
};

/**
 * Renders a config panel inside {@link createProviderWrapper}'s provider stack.
 */
export const renderWithProviders = (
  component: React.ReactElement,
  props: ProviderProps = {},
): RenderResult => render(component, { wrapper: createProviderWrapper(props) });

/**
 * The provider stack a config panel needs: the two bpmn contexts, the services and query client the
 * panels' own queries read from, inside a router because they take the org and app from the url.
 * Use it directly to render one of the panels' hooks.
 */
export const createProviderWrapper = ({
  bpmnContextProps,
  bpmnApiContextProps,
  queries,
  queryClient = createQueryClientMock(),
}: ProviderProps) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestAppRouter>
      <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
        <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
          <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
            {children}
          </BpmnContext.Provider>
        </BpmnApiContext.Provider>
      </ServicesContextProvider>
    </TestAppRouter>
  );

  return Wrapper;
};
