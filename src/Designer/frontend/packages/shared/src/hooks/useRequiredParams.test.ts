import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRequiredParams } from './useRequiredParams';
import { useParams } from 'react-router-dom';

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(),
}));

type TestParams = {
  owner: string;
  app: string;
  environment: string;
};

describe('useRequiredParams', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns required single param when present', () => {
    (useParams as Mock).mockReturnValue({ owner: 'ttd' });

    const { result } = renderHook(() => useRequiredParams<TestParams, 'owner'>('owner'));

    expect(result.current).toEqual({ owner: 'ttd' });
  });

  it('returns required params when all are present', () => {
    (useParams as Mock).mockReturnValue({
      owner: 'ttd',
      app: 'my-app',
      environment: 'at22',
    });

    const { result } = renderHook(() =>
      useRequiredParams<TestParams, 'owner' | 'app'>(['owner', 'app']),
    );

    expect(result.current).toEqual({ owner: 'ttd', app: 'my-app', environment: 'at22' });
  });

  it('throws when a required param is missing', () => {
    (useParams as Mock).mockReturnValue({ owner: 'ttd' });

    expect(() => {
      renderHook(() => useRequiredParams<TestParams, 'owner' | 'app'>(['owner', 'app']));
    }).toThrow('Missing required route params: app');
  });
});
