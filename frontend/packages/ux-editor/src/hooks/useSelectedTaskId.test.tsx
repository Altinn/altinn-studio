import type { ReactNode } from 'react';
import React from 'react';
import { useSelectedTaskId } from './';
import { layoutSetsMock } from '../testing/layoutMock';
import { renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { TASKID_FOR_STATELESS_APPS } from 'app-shared/constants';

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

describe('useSelectedTaskId', () => {
  afterEach(jest.clearAllMocks);

  it('should return the default task id when it does not exist', async () => {
    const { result } = renderHook(() => useSelectedTaskId(selectedLayoutSet), { wrapper });
    expect(result.current).toEqual(TASKID_FOR_STATELESS_APPS);
  });

  it('should return the selected task when it exists', async () => {
    const taskTest = 'Task_Test';

    const client = createQueryClientMock();
    client.setQueryData([QueryKey.LayoutSets, org, app], {
      sets: [
        {
          id: selectedLayoutSet,
          tasks: [taskTest],
        },
      ],
    });

    const { result } = renderHook(() => useSelectedTaskId(selectedLayoutSet), {
      wrapper: ({ children }) => {
        return wrapper({ children, client });
      },
    });

    expect(result.current).toEqual(taskTest);
  });
});
