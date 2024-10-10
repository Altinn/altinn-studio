import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from '@altinn/ux-editor/testing/mocks';
import { useAddOptionMutation } from '@altinn/ux-editor/hooks/mutations/useAddOptionMutation';

// Test data:
const entries = jest.fn();
const formData = new FormData();
formData.entries = entries;

describe('useAddOptionsMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls useAddOptionsMutation with correct arguments and payload', async () => {
    const optionsResult = renderHookWithProviders(() => useAddOptionMutation(org, app)).result;

    await optionsResult.current.mutateAsync(formData);

    expect(queriesMock.uploadOption).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadOption).toHaveBeenCalledWith(org, app, formData);
  });
});
