import { renderHook } from '@testing-library/react';
import { useSearchParamsState } from './useSearchParamsState';
import { useSearchParams } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  useSearchParams: jest.fn(),
}));

describe('useSearchParamsState', () => {
  it('should return the default value when the parameter is missing from the url', () => {
    const searchParams = new URLSearchParams();
    (useSearchParams as jest.Mock).mockReturnValue([searchParams, jest.fn()]);

    const { result } = renderHook(() => useSearchParamsState('test', 10));

    expect(result.current[0]).toEqual(10);
  });

  it('should return the value of the parameter', () => {
    const searchParams = new URLSearchParams('test=20');
    (useSearchParams as jest.Mock).mockReturnValue([searchParams, jest.fn()]);

    const { result } = renderHook(() => useSearchParamsState('test', 10, Number));

    expect(result.current[0]).toEqual(20);
  });
});
