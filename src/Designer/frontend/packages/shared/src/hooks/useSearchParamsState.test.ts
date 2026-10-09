import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSearchParamsState } from './useSearchParamsState';
import { useSearchParams } from 'react-router-dom';

vi.mock('react-router-dom', () => ({
  useSearchParams: vi.fn(),
}));

describe('useSearchParamsState', () => {
  it('should return the default value when the parameter is missing from the url', () => {
    const searchParams = new URLSearchParams();
    (useSearchParams as Mock).mockReturnValue([searchParams, vi.fn()]);

    const { result } = renderHook(() => useSearchParamsState('test', 10));

    expect(result.current[0]).toEqual(10);
  });

  it('should return the value of the parameter', () => {
    const searchParams = new URLSearchParams('test=20');
    (useSearchParams as Mock).mockReturnValue([searchParams, vi.fn()]);

    const { result } = renderHook(() => useSearchParamsState('test', 10, Number));

    expect(result.current[0]).toEqual(20);
  });
});
