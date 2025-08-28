import type { ReactNode } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { useSelectedFormLayoutName } from './useSelectedFormLayoutName';

// Test data:
const selectedLayoutSet: string = 'selectedLayoutSet';
const layout1NameMock: string = 'Side1';

const mockSetSearchParams = jest.fn();
const mockSearchParams = { layout: layout1NameMock };
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

  it('should return selected layout when the selected layout is valid and in a group', async () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.FormLayoutSettings, org, app, selectedLayoutSet], {
      pages: {
        groups: { order: [layout1NameMock] },
      },
    });
    client.setQueryData([QueryKey.Pages, org, app, selectedLayoutSet], {
      groups: [{ order: { id: layout1NameMock } }],
    });

    const { result } = renderHook(() => useSelectedFormLayoutName(selectedLayoutSet), {
      wrapper: ({ children }) => {
        return wrapper({ children, client });
      },
    });

    expect(result.current.selectedFormLayoutName).toEqual(layout1NameMock);
  });

  it('should return selected layout when the selected layout is valid', async () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.FormLayoutSettings, org, app, selectedLayoutSet], {
      pages: {
        order: [layout1NameMock],
      },
    });
    client.setQueryData([QueryKey.Pages, org, app, selectedLayoutSet], {
      pages: [{ id: layout1NameMock }],
    });

    const { result } = renderHook(() => useSelectedFormLayoutName(selectedLayoutSet), {
      wrapper: ({ children }) => {
        return wrapper({ children, client });
      },
    });

    expect(result.current.selectedFormLayoutName).toEqual(layout1NameMock);
  });
});
