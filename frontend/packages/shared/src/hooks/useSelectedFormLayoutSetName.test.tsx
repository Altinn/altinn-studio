import type { ReactNode } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { useSelectedFormLayoutSetName } from './useSelectedFormLayoutSetName';
import { type LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { typedLocalStorage } from '@studio/pure-functions';
import { FeatureFlag } from 'app-shared/utils/featureToggleUtils';

// Test data:
export const layoutSet1NameMock = 'test-layout-set';
export const layoutSet2NameMock = 'test-layout-set-2';
export const layoutSetsMock: LayoutSets = {
  sets: [
    {
      id: layoutSet1NameMock,
      dataType: 'data-model',
      tasks: ['Task_1'],
    },
    {
      id: layoutSet2NameMock,
      dataType: 'data-model-2',
      tasks: ['Task_2'],
    },
  ],
};

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
  afterEach(() => {
    typedLocalStorage.removeItem('featureFlags');
    jest.clearAllMocks;
  });

  it('should return empty string when there are no layout sets', async () => {
    const { result } = renderHook(() => useSelectedFormLayoutSetName(undefined), { wrapper });
    expect(result.current.selectedFormLayoutSetName).toEqual('');
  });

  it('should return default layout set when selected does not exist', async () => {
    const client = createQueryClientMock();

    const { result } = renderHook(() => useSelectedFormLayoutSetName(layoutSetsMock), {
      wrapper: ({ children }) => {
        return wrapper({ children, client });
      },
    });
    expect(result.current.selectedFormLayoutSetName).toEqual(layoutSetsMock.sets[0].id);
  });

  it('should return undefined when selected layout does not exist and taskNavigation feature flag is enabled', async () => {
    const client = createQueryClientMock();
    typedLocalStorage.setItem('featureFlags', [FeatureFlag.TaskNavigation]);

    const { result } = renderHook(() => useSelectedFormLayoutSetName(layoutSetsMock), {
      wrapper: ({ children }) => {
        return wrapper({ children, client });
      },
    });
    expect(result.current.selectedFormLayoutSetName).toEqual(undefined);
  });

  it('should return selected layout set when selected does exist', async () => {
    const client = createQueryClientMock();

    const { result } = renderHook(() => useSelectedFormLayoutSetName(layoutSetsMock), {
      wrapper: ({ children }) => {
        return wrapper({ children, client });
      },
    });

    expect(result.current.selectedFormLayoutSetName).toEqual(layoutSet1NameMock);
  });
});
