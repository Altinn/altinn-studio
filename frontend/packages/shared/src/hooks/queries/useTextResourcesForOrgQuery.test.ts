import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { waitFor } from '@testing-library/react';
import { org } from '@studio/testing/testids';
import { useTextResourcesForOrgQuery } from './useTextResourcesForOrgQuery';

const languageMock: string = 'nb';

describe('useTextResourcesForOrgQuery', () => {
  beforeEach(jest.clearAllMocks);

  it('calls getTextResourcesForOrg with the correct parameters', () => {
    renderAndWaitForResult();
    expect(queriesMock.getTextResourcesForOrg).toHaveBeenCalledWith(org, languageMock);
    expect(queriesMock.getTextResourcesForOrg).toHaveBeenCalledTimes(1);
  });
});

const renderAndWaitForResult = async (): Promise<void> => {
  const { result } = renderHookWithProviders(() => useTextResourcesForOrgQuery(org, languageMock));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
};
