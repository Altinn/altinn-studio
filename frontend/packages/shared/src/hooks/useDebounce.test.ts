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

  it('should only call the callback once if multiple debounces are called', () => {
    const debounceTimeInMs = 1000;
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce({ debounceTimeInMs }));

    result.current.debounce(callback);
    jest.advanceTimersByTime(debounceTimeInMs / 2);
    result.current.debounce(callback);
    jest.advanceTimersByTime(debounceTimeInMs / 2);
    result.current.debounce(callback);
    jest.advanceTimersByTime(debounceTimeInMs / 2);
    result.current.debounce(callback);

    jest.advanceTimersByTime(debounceTimeInMs);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not call the callback if the hook is unmounted', () => {
    const debounceTimeInMs = 1000;
    const callback = jest.fn();
    const { result, unmount } = renderHook(() => useDebounce({ debounceTimeInMs }));
    result.current.debounce(callback);
    unmount();
    jest.advanceTimersByTime(debounceTimeInMs);
    expect(callback).not.toHaveBeenCalled();
  });
});
