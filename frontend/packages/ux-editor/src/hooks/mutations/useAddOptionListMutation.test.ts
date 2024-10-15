import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from '@altinn/ux-editor/testing/mocks';
import { useAddOptionListMutation } from '@altinn/ux-editor/hooks/mutations/useAddOptionListMutation';

// Test data:
const entries = jest.fn();
const formData = new FormData();
formData.entries = entries;

describe('useAddOptionsMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls useAddOptionsMutation with correct arguments and payload', async () => {
    const optionsResult = renderHookWithProviders(() => useAddOptionListMutation(org, app)).result;

    await optionsResult.current.mutateAsync(formData);

    expect(queriesMock.uploadOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadOptionList).toHaveBeenCalledWith(org, app, formData);
  });
});
