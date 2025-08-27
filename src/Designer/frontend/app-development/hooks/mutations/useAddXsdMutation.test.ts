import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../../test/mocks';
import { useAddXsdMutation } from './useAddXsdMutation';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';

// Test data:
const modelPath: string = 'modelPath';

describe('useAddXsdMutation', () => {
  it('Calls useAddXsdMutation with correct arguments', async () => {
    const addDataModelXsd = renderHookWithProviders()(() => useAddXsdMutation()).renderHookResult
      .result;
    await addDataModelXsd.current.mutateAsync(modelPath);
    await waitFor(() => expect(addDataModelXsd.current.isSuccess).toBe(true));

    expect(queriesMock.addXsdFromRepo).toHaveBeenCalledTimes(1);
    expect(queriesMock.addXsdFromRepo).toHaveBeenCalledWith(org, app, modelPath);
  });
});
