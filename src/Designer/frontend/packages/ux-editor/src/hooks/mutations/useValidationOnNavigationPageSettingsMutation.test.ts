import { waitFor } from '@testing-library/react';
import type { IValidationOnNavigationPageSettings } from 'app-shared/types/global';
import { renderHookWithProviders } from '../../testing/mocks';
import { useValidationOnNavigationPageSettingsMutation } from './useValidationOnNavigationPageSettingsMutation';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';

// Test data:
const settings: IValidationOnNavigationPageSettings[] = [
  {
    task: 'layoutSet1',
    pages: ['side1', 'side3'],
    show: ['Schema', 'Required'],
    page: 'current',
  },
  {
    task: 'layoutSet2',
    pages: ['side2'],
    show: ['AllExceptRequired'],
    page: 'currentAndPrevious',
  },
];

describe('useValidationOnNavigationPageSettingsMutation', () => {
  afterEach(jest.clearAllMocks);

  it('calls updateValidationOnNavigationPageSettings with the correct parameters', async () => {
    const { result } = renderMutation();
    result.current.mutate(settings);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.updateValidationOnNavigationPageSettings).toHaveBeenCalledWith(
      org,
      app,
      settings,
    );
  });
});

const renderMutation = (queryClient = createQueryClientMock()) =>
  renderHookWithProviders(() => useValidationOnNavigationPageSettingsMutation(org, app), {
    queryClient,
  });
