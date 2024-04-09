import type { ReactNode } from 'react';
import React from 'react';
import { useSelectedFormLayoutName } from './';
import { layoutSetsMock, layout1NameMock } from '../testing/layoutMock';
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

const mockSetSearchParams = jest.fn();
const mockSearchParams = { layout: 'Side1' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org,
    app,
  }),
  useSearchParams: () => {
    return [new URLSearchParams(mockSearchParams), mockSetSearchParams];
  },
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

describe('useSelectedFormLayoutName', () => {
  afterEach(jest.clearAllMocks);

  it('should return undefined when the select layout is invalid', async () => {
    const { result } = renderHook(() => useSelectedFormLayoutName(selectedLayoutSet), { wrapper });
    expect(result.current.selectedFormLayoutName).toEqual(undefined);
  });

  it('should return selected layout when the selected layout is valid', async () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.FormLayoutSettings, org, app, selectedLayoutSet], {
      pages: {
        order: [layout1NameMock],
      },
    });

    const { result } = renderHook(() => useSelectedFormLayoutName(selectedLayoutSet), {
      wrapper: ({ children }) => {
        return wrapper({ children, client });
      },
    });

    expect(result.current.selectedFormLayoutName).toEqual(layout1NameMock);
  });
});
