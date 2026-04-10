import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../testing/mocks';
import { useOrganizationsQuery } from './useOrganizationsQuery';
import { queriesMock } from 'app-shared/mocks/queriesMock';

describe('useOrganizationsQuery', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls getOrganizations', async () => {
    const { result } = renderHookWithProviders(() => useOrganizationsQuery());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.getOrganizations).toHaveBeenCalledTimes(1);
  });
});
