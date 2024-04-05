import type { ReactNode } from 'react';
import React from 'react';
import { useSelectedFormLayoutSetName } from './';
import { layoutSetsMock } from '../testing/layoutMock';
import { renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = layoutSetsMock.sets[0].id;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org,
    app,
  }),
}));

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
});
