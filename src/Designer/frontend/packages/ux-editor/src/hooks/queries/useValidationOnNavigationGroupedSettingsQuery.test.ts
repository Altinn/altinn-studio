import { waitFor } from '@testing-library/react';
import type { IValidationOnNavigationLayoutSettings } from 'app-shared/types/global';
import { renderHookWithProviders } from '../../testing/mocks';
import { useValidationOnNavigationGroupedSettingsQuery } from './useValidationOnNavigationGroupedSettingsQuery';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';

// Test data:
const settingWithValidateOnNavigationRule1: IValidationOnNavigationLayoutSettings = {
  tasks: ['Task_1'],
  show: ['Schema', 'Required'],
  page: 'current',
};
const settingWithValidateOnNavigationRule2: IValidationOnNavigationLayoutSettings = {
  tasks: ['Task_2', 'Task_3'],
  show: ['AllExceptRequired'],
  page: 'currentAndPrevious',
};

const validationSettings: IValidationOnNavigationLayoutSettings[] = [
  settingWithValidateOnNavigationRule1,
  settingWithValidateOnNavigationRule2,
];

// Mocks:
const getValidationOnNavigationLayoutSettings = jest
  .fn()
  .mockImplementation(() => Promise.resolve(validationSettings));

describe('useValidationOnNavigationGroupedSettingsQuery', () => {
  const queryClient = createQueryClientMock();
  beforeEach(() => {
    queryClient.clear();
    getValidationOnNavigationLayoutSettings.mockClear();
  });

  it('calls getValidationOnNavigationLayoutSettings with the correct parameters', async () => {
    await render();
    expect(getValidationOnNavigationLayoutSettings).toHaveBeenCalledWith(org, app);
  });

  it('returns all grouped settings with validation on navigation', async () => {
    const view = await render();
    expect(view.current.data).toEqual([
      settingWithValidateOnNavigationRule1,
      settingWithValidateOnNavigationRule2,
    ]);
  });

  it('returns an empty array when the API returns no settings', async () => {
    queryClient.setQueryData([QueryKey.ValidationOnNavigationLayoutSettings, org, app], []);
    const view = await render({ queryClient });
    expect(view.current.data).toEqual([]);
  });

  it('sets isError to true when the API call fails', async () => {
    const getFailing = jest
      .fn()
      .mockImplementation(() => Promise.reject(new Error('Failed to fetch')));
    const view = await render({
      queryClient,
      queries: { getValidationOnNavigationLayoutSettings: getFailing },
    });
    expect(view.current.isError).toBe(true);
  });
});

type RenderProps = {
  queries?: { getValidationOnNavigationLayoutSettings?: jest.Mock };
  queryClient?: QueryClient;
};

const render = async ({ queries, queryClient }: RenderProps = {}) => {
  const { result } = renderHookWithProviders(
    () => useValidationOnNavigationGroupedSettingsQuery(org, app),
    {
      queryClient: queryClient,
      queries: { getValidationOnNavigationLayoutSettings, ...queries },
    },
  );
  await waitFor(() => {
    expect(result.current.isSuccess || result.current.isError).toBe(true);
  });
  return result;
};
