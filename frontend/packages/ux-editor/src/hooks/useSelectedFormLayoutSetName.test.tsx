import type { ReactNode } from 'react';
import React from 'react';
import { useSelectedFormLayoutSetName } from './';
import { layoutSet1NameMock, layoutSetsMock } from '../testing/layoutSetsMock';
import { renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { typedLocalStorage } from '@studio/components/src/hooks/webStorage';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;

const wrapper = ({
  children,
  queries = {},
  client,
}: {
  children: ReactNode;
  queries?: Partial<ServicesContextProps>;
  client?: QueryClient;
}) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };
  return (
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={client}>
        {children}
      </ServicesContextProvider>
    </MemoryRouter>
  );
};

describe('useSelectedFormLayoutSetName', () => {
  afterEach(jest.clearAllMocks);

  it('should return undefined when the select layout set is invalid', async () => {
    const { result } = renderHook(() => useSelectedFormLayoutSetName(), { wrapper });
    expect(result.current.selectedFormLayoutSetName).toEqual(undefined);
  });

  it('should return selected layout when the selected layout set is valid', async () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);

    const { result } = renderHook(() => useSelectedFormLayoutSetName(), {
      wrapper: ({ children }) => {
        return wrapper({ children, client });
      },
    });

    expect(result.current.selectedFormLayoutSetName).toEqual(selectedLayoutSet);
  });

  it('Should initialize state with local storage value', async () => {
    const storageKey = 'layoutSet/' + app;
    typedLocalStorage.setItem(storageKey, selectedLayoutSet);

    const client = createQueryClientMock();
    client.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);

    const { result } = renderHook(() => useSelectedFormLayoutSetName(), {
      wrapper: ({ children }) => {
        return wrapper({ children, client });
      },
    });

    expect(result.current.selectedFormLayoutSetName).toEqual(selectedLayoutSet);
  });

  // it('Should update local storage based on the state', async () => {
  //   const storageKey = 'layoutSet/' + app;
  //   const newLayoutSetName = 'newLayoutSet';

  //   const client = createQueryClientMock();
  //   client.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);

  //   const { result } = renderHook(() => useSelectedFormLayoutSetName(), {
  //     wrapper: ({ children }) => {
  //       return wrapper({ children, client });
  //     },
  //   });

  //   await waitFor(() => {
  //     result.current.setSelectedFormLayoutSetName(newLayoutSetName);
  //   });

  //   expect(typedLocalStorage.getItem(storageKey)).toEqual(newLayoutSetName);
  // });
});
