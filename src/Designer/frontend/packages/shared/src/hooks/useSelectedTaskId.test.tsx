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
import { TASKID_FOR_STATELESS_APPS } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import { useSelectedTaskId } from './useSelectedTaskId';

// Test data:
export const layoutSet1NameMock = 'test-layout-set';
export const layout1NameMock = 'Side1';

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

describe('useSelectedTaskId', () => {
  afterEach(jest.clearAllMocks);

  it('should return the default task id when it does not exist', async () => {
    const { result } = renderHook(() => useSelectedTaskId(layoutSet1NameMock), { wrapper });
    expect(result.current).toEqual(TASKID_FOR_STATELESS_APPS);
  });

  it('should return the selected task when it exists', async () => {
    const taskTest = 'Task_Test';

    const client = createQueryClientMock();
    client.setQueryData([QueryKey.LayoutSets, org, app], {
      sets: [
        {
          id: layoutSet1NameMock,
          tasks: [taskTest],
        },
      ],
    });

    const { result } = renderHook(() => useSelectedTaskId(layoutSet1NameMock), {
      wrapper: ({ children }) => {
        return wrapper({ children, client });
      },
    });

    expect(result.current).toEqual(taskTest);
  });
});
