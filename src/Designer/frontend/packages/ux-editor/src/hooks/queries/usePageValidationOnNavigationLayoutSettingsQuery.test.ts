import { waitFor } from '@testing-library/react';
import type { IValidationOnNavigationPageSettings } from 'app-shared/types/global';
import { renderHookWithProviders } from '../../testing/mocks';
import { useValidationOnNavigationPageSettingsQuery } from './usePageValidationOnNavigationLayoutSettingsQuery';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';

// Test data:
const group1: IValidationOnNavigationPageSettings = {
  task: 'layoutSet1',
  pages: ['side1', 'side3'],
  page: 'current',
  show: ['All'],
};
const group2: IValidationOnNavigationPageSettings = {
  task: 'layoutSet1',
  pages: ['side2'],
  page: 'currentAndPrevious',
  show: ['All'],
};

const pageValidationSettings: IValidationOnNavigationPageSettings[] = [group1, group2];

// Mocks:
const GetValidationOnNavigationPageSettings = jest
  .fn()
  .mockImplementation(() => Promise.resolve(pageValidationSettings));

describe('useValidationOnNavigationPageSettingsQuery', () => {
  const queryClient = createQueryClientMock();
  beforeEach(() => {
    queryClient.clear();
    GetValidationOnNavigationPageSettings.mockClear();
  });

  it('calls GetValidationOnNavigationPageSettings with the correct parameters', async () => {
    await render();
    expect(GetValidationOnNavigationPageSettings).toHaveBeenCalledWith(org, app);
  });

  it('returns all page groups with their validationOnNavigation settings', async () => {
    const view = await render();
    expect(view.current.data).toEqual([group1, group2]);
  });

  it('returns an empty array when the API returns no settings', async () => {
    queryClient.setQueryData([QueryKey.ValidationOnNavigationPageSettings, org, app], []);
    const view = await render({ queryClient });
    expect(view.current.data).toEqual([]);
  });

  it('sets isError to true when the API call fails', async () => {
    const getFailing = jest
      .fn()
      .mockImplementation(() => Promise.reject(new Error('Failed to fetch')));
    const view = await render({
      queryClient,
      queries: { getValidationOnNavigationPageSettings: getFailing },
    });
    expect(view.current.isError).toBe(true);
  });
});

type RenderProps = {
  queries?: { getValidationOnNavigationPageSettings?: jest.Mock };
  queryClient?: QueryClient;
};

const render = async ({ queries, queryClient }: RenderProps = {}) => {
  const { result } = renderHookWithProviders(
    () => useValidationOnNavigationPageSettingsQuery(org, app),
    {
      queryClient: queryClient,
      queries: {
        getValidationOnNavigationPageSettings: GetValidationOnNavigationPageSettings,
        ...queries,
      },
    },
  );
  await waitFor(() => {
    expect(result.current.isSuccess || result.current.isError).toBe(true);
  });
  return result;
};
