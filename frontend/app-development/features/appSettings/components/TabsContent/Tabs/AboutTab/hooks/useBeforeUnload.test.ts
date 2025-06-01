import { act, renderHook } from '@testing-library/react';
import { useBeforeUnload } from './useBeforeUnload';

describe('useBeforeUnload', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should not set warning when shouldWarn is false', () => {
    const { result } = renderHook(() => useBeforeUnload(false));

    const event = new Event('beforeunload');
    window.dispatchEvent(event);

    expect(result.current).toBe(false);
  });

  it('should set warning to true when shouldWarn is true and beforeunload is triggered', () => {
    const { result } = renderHook(() => useBeforeUnload(true));

    const event = new Event('beforeunload');
    Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

    act(() => window.dispatchEvent(event));

    expect(result.current).toBe(true);
  });

  it('adds and removes beforeunload event listener', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useBeforeUnload(true));

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
});
