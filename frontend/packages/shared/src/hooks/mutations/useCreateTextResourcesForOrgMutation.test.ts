import { queriesMock } from '../../mocks/queriesMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useCreateTextResourcesForOrgMutation } from './useCreateTextResourcesForOrgMutation';
import { waitFor } from '@testing-library/react';
import { org } from '@studio/testing/testids';

const languageMock: string = 'nb';

describe('useCreateTextResourcesForOrgMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls createTextResourcesForOrg with correct arguments and payload', async () => {
    const renderResult = renderHookWithProviders(() =>
      useCreateTextResourcesForOrgMutation(org, languageMock),
    ).result;

    renderResult.current.mutate();
    await waitFor(() => expect(renderResult.current.isSuccess).toBe(true));

    expect(queriesMock.createTextResourcesForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.createTextResourcesForOrg).toHaveBeenCalledWith(org, languageMock);
  });
});
