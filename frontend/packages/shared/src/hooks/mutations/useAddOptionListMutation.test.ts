import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { useAddOptionListMutation } from './useAddOptionListMutation';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';

// Test data:
const file = new File(['hello'], 'hello.json', { type: 'text/json' });
const formData = new FormData();
formData.append('file', file);

describe('useAddOptionsMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls useAddOptionsMutation with correct arguments and payload', async () => {
    const optionsResult = renderHookWithProviders(() => useAddOptionListMutation(org, app)).result;

    await optionsResult.current.mutateAsync(file);

    expect(queriesMock.uploadOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadOptionList).toHaveBeenCalledWith(org, app, formData);
  });
});
