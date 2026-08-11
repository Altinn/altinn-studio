import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { usePrefillQuery } from './usePrefillQuery';
import { renderHookWithProviders } from '../../test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';

const modelPath = 'App/models/model.schema.json';

describe('usePrefillQuery', () => {
  afterEach(jest.clearAllMocks);

  it('Calls getDataModelPrefill with correct arguments', async () => {
    const {
      renderHookResult: { result },
    } = renderHookWithProviders({}, createQueryClientMock())(() => usePrefillQuery(modelPath));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.getDataModelPrefill).toHaveBeenCalledTimes(1);
    expect(queriesMock.getDataModelPrefill).toHaveBeenCalledWith(org, app, modelPath);
  });
});
