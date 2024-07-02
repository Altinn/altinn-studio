import { renderHook } from '@testing-library/react';
import { useDebounce } from './useDebounce';

jest.useFakeTimers();

describe('useDebounce', () => {
  it('should call the callback function after the specified debounce time', () => {
    const debounceTimeInMs = 1000;
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce({ debounceTimeInMs }));
    result.current.debounce(callback);

    jest.advanceTimersByTime(debounceTimeInMs - 1);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalled();
  });
});
