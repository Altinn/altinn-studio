import { waitFor } from '@testing-library/react';
import type { IValidationOnNavigationLayoutSettings } from 'app-shared/types/global';
import { renderHookWithProviders } from '../../testing/mocks';
import { useUpdateValidationOnNavigationLayoutSettingsMutation } from './useUpdateValidationOnNavigationLayoutSettingsMutation';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';

// Test data:
const settings: IValidationOnNavigationLayoutSettings[] = [
  {
    tasks: ['Task_1'],
    show: ['Schema', 'Required'],
    page: 'current',
  },
  {
    tasks: ['Task_2', 'Task_3'],
    show: ['AllExceptRequired'],
    page: 'currentAndPrevious',
  },
];

describe('useUpdateValidationOnNavigationLayoutSettingsMutation', () => {
  afterEach(jest.clearAllMocks);

  it('calls updateValidationOnNavigationLayoutSettings with the correct parameters', async () => {
    const { result } = renderMutation();
    result.current.mutate(settings);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.updateValidationOnNavigationLayoutSettings).toHaveBeenCalledWith(
      org,
      app,
      settings,
    );
  });
});

const renderMutation = (queryClient = createQueryClientMock()) =>
  renderHookWithProviders(() => useUpdateValidationOnNavigationLayoutSettingsMutation(org, app), {
    queryClient,
  });
