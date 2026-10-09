import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { queriesMock } from '../../mocks/queriesMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useOrganizationsQuery } from './useOrganizationsQuery';

describe('useOrganizationsQuery', () => {
  afterEach(() => vi.clearAllMocks());

  it('calls getOrganizations', async () => {
    const { result } = renderHookWithProviders(() => useOrganizationsQuery());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.getOrganizations).toHaveBeenCalledTimes(1);
  });
});
